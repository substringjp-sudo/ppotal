import Link from "next/link";
import { Introduction } from "@/components/landing/Introduction";

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center min-h-[70vh] gap-8 px-4 text-center max-w-4xl">
        <div className="flex flex-col gap-4">
          <h1 className="text-6xl md:text-8xl font-black tracking-tight bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
            Regionevel
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 font-medium max-w-2xl mx-auto">
            Your travel experiences, quantified and visualized.
            Map your world, city by city.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/map"
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 hover:scale-105 transition-all shadow-xl shadow-blue-200"
          >
            Start Exploring
          </Link>
          <Link
            href="#how-it-works"
            className="px-8 py-4 bg-white text-gray-700 border-2 border-gray-100 rounded-2xl font-bold text-lg hover:bg-gray-50 hover:border-gray-200 transition-all"
          >
            How it Works
          </Link>
        </div>
      </section>

      {/* Onboarding / Introduction Section */}
      <div id="how-it-works" className="w-full bg-white">
        <Introduction />
      </div>

      {/* Footer-like Call to Action */}
      <section className="py-20 px-4 text-center bg-slate-50 w-full border-t border-gray-100">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">Ready to record your journey?</h2>
        <Link
          href="/map"
          className="px-10 py-5 bg-indigo-600 text-white rounded-full font-black text-xl hover:bg-indigo-700 hover:shadow-2xl transition-all inline-block"
        >
          Open World Map
        </Link>
      </section>
    </div>
  );
}
