import Link from "next/link";
import { Introduction } from "@/components/landing/Introduction";

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-slate-50">

      {/* Onboarding / Introduction Section */}
      <div id="how-it-works" className="w-full bg-white">
        <Introduction />
      </div>

      {/* Footer-like Call to Action */}
      <section className="py-20 px-4 text-center bg-slate-50 w-full border-t border-gray-100">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">Ready to record your journey?</h2>
        <Link
          href="/map"
          className="px-10 py-4 bg-slate-900 text-white font-black text-xl hover:bg-slate-800 transition-all inline-block shadow-lg"
        >
          Open World Map
        </Link>
      </section>
    </div>
  );
}
