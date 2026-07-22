import { NextResponse } from "next/server";
import crypto from "crypto";

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function generateOAuth1Header(
  method: string,
  url: string,
  queryParams: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  token: string,
  tokenSecret: string
): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: token,
    oauth_version: "1.0",
    ...queryParams,
  };

  const sortedKeys = Object.keys(oauthParams).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k] || "")}`)
    .join("&");
  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  const authHeaderKeys = ["oauth_consumer_key", "oauth_nonce", "oauth_signature", "oauth_signature_method", "oauth_timestamp", "oauth_token", "oauth_version"];
  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };

  return "OAuth " + authHeaderKeys.map((k) => `${percentEncode(k)}="${percentEncode(headerParams[k] || "")}"`).join(", ");
}

export async function POST(req: Request) {
  try {
    const { text, imageData, accessToken, accessSecret } = await req.json();

    const consumerKey = process.env.TWITTER_CONSUMER_KEY || process.env.NEXT_PUBLIC_TWITTER_CONSUMER_KEY;
    const consumerSecret = process.env.TWITTER_CONSUMER_SECRET || process.env.NEXT_PUBLIC_TWITTER_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: "TWITTER_APP_NOT_CONFIGURED", message: "X API Consumer Key / Secret environment variables are not configured in backend." },
        { status: 501 }
      );
    }

    if (!accessToken || !accessSecret) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "X Access Token and Secret are required." },
        { status: 401 }
      );
    }

    // 1. Upload image to Twitter Media API (v1.1)
    const base64Data = imageData ? imageData.replace(/^data:image\/\w+;base64,/, "") : "";
    let mediaId: string | null = null;

    if (base64Data) {
      const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
      const uploadBody = new URLSearchParams();
      uploadBody.append("media_data", base64Data);

      const uploadAuthHeader = generateOAuth1Header(
        "POST",
        uploadUrl,
        {},
        consumerKey,
        consumerSecret,
        accessToken,
        accessSecret
      );

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: uploadAuthHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: uploadBody.toString(),
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error("X Media Upload failed:", uploadRes.status, errorText);
        return NextResponse.json(
          { error: "MEDIA_UPLOAD_FAILED", details: errorText },
          { status: uploadRes.status }
        );
      }

      const uploadData = await uploadRes.json();
      mediaId = uploadData.media_id_string;
    }

    // 2. Create Tweet with attached media (v2)
    const tweetUrl = "https://api.twitter.com/2/tweets";
    const tweetAuthHeader = generateOAuth1Header(
      "POST",
      tweetUrl,
      {},
      consumerKey,
      consumerSecret,
      accessToken,
      accessSecret
    );

    const payload: any = { text };
    if (mediaId) {
      payload.media = { media_ids: [mediaId] };
    }

    const tweetRes = await fetch(tweetUrl, {
      method: "POST",
      headers: {
        Authorization: tweetAuthHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!tweetRes.ok) {
      const errorText = await tweetRes.text();
      console.error("X Tweet Creation failed:", tweetRes.status, errorText);
      return NextResponse.json(
        { error: "TWEET_CREATION_FAILED", details: errorText },
        { status: tweetRes.status }
      );
    }

    const tweetData = await tweetRes.json();
    const tweetId = tweetData.data?.id;
    const tweetLink = tweetId ? `https://x.com/i/status/${tweetId}` : "https://x.com";

    return NextResponse.json({
      success: true,
      tweetId,
      tweetLink,
    });
  } catch (err: any) {
    console.error("X Direct Post API Error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
