import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] gap-6 px-4">
      <h1 className="text-4xl font-bold text-blue-700">Regionevel</h1>
      <p className="text-gray-500 text-center max-w-sm">
        Track your regional travel experiences and see your score grow as you explore more.
      </p>
      <div className="flex gap-4">
        <Link
          href="/map"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          View Map
        </Link>
        <Link
          href="/list"
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          View List
        </Link>
      </div>
    </div>
  );
}
