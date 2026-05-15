import './globals.css'

export default function Home() {
  return (
    <main className="container">
      <div className="bg-blobs">
        <div className="blob-1"></div>
        <div className="blob-2"></div>
      </div>

      <header className="animate-up">
        <div className="logo">PPLANER</div>
      </header>

      <section className="hero">
        <h1 className="animate-up delay-1">
          The True Value of Travel,<br />
          Recorded by Your Own Hands
        </h1>
        <p className="animate-up delay-2">
          Pplaner views travel as more than just consumption.<br />
          We empower you to craft your own unique narrative by personally documenting <br />
          every place, every emotion, and every moment that defines your journey.
        </p>
      </section>

      <div className="services-grid animate-up delay-3">
        <div className="service-card">
          <img src="/screenshots/jprail-main.jpeg" alt="jpRail Preview" className="service-thumbnail" />
          <h2>jpRail</h2>
          <p>
            The ultimate companion for Japanese rail travel. 
            Meticulously track routes, schedules, and document your unique railway adventure.
          </p>
          <div className="screenshot-gallery-container">
            <div className="screenshot-gallery">
              <img src="/screenshots/jprail-1.jpeg" alt="Gallery 1" className="gallery-item" />
              <img src="/screenshots/jprail-2.jpeg" alt="Gallery 2" className="gallery-item" />
              <img src="/screenshots/jprail-3.jpeg" alt="Gallery 3" className="gallery-item" />
            </div>
          </div>
          <a href="https://jprail.pplaner.com" className="service-link">Go to Service</a>
        </div>

        <div className="service-card">
          <img src="/screenshots/rgnevel-main.jpeg" alt="Regionevel Preview" className="service-thumbnail" />
          <h2>Regionevel</h2>
          <p>
            Capture the hidden charms of every locale. 
            Transform your footsteps into a curated collection of local memories and atmosphere.
          </p>
          <div className="screenshot-gallery-container">
            <div className="screenshot-gallery">
              <img src="/screenshots/rgnevel-1.jpeg" alt="Gallery 1" className="gallery-item" />
              <img src="/screenshots/rgnevel-2.jpeg" alt="Gallery 2" className="gallery-item" />
              <img src="/screenshots/rgnevel-3.jpeg" alt="Gallery 3" className="gallery-item" />
            </div>
          </div>
          <a href="https://rgnevel.pplaner.com" className="service-link">Go to Service</a>
        </div>
      </div>
    </main>
  )
}
