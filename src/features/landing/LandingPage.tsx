import { useLayoutEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './landing.css';

gsap.registerPlugin(ScrollTrigger);

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const [formState, setFormState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [slideIndex, setSlideIndex] = useState(0);
  const slides = [
    { label: 'Bar', src: '/bar.png' },
    { label: 'Quarto', src: '/quarto.png' },
    { label: 'Esteira', src: '/esteira.png' },
  ];
  const nextSlide = useCallback(() => setSlideIndex(i => (i + 1) % slides.length), [slides.length]);

  const deckStyles = (i: number) => {
    const offset = (i - slideIndex + slides.length) % slides.length;
    if (offset === 0) return { zIndex: 3, transform: 'translateX(0) rotate(0deg) scale(1)', opacity: 1 };
    if (offset === 1) return { zIndex: 2, transform: 'translateX(7%) translateY(-2%) rotate(4deg) scale(0.93)', opacity: 0.85 };
    return { zIndex: 1, transform: 'translateX(-5%) translateY(-4%) rotate(-3deg) scale(0.87)', opacity: 0.7 };
  };

  /* ── Nav scroll state ────────────────────────────────────── */
  useLayoutEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── GSAP Animations ─────────────────────────────────────── */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const isMobile = window.innerWidth <= 768;

      /* Hero: tudo escondido inicialmente */
      gsap.set('.l-hero__brand',      { opacity: 0, y: 24 });
      gsap.set('.l-hero__subtitle',   { opacity: 0, y: 20 });
      gsap.set('.l-hero__actions',    { opacity: 0, y: 20 });
      gsap.set('.l-hero__scroll',     { opacity: 0 });

      if (isMobile) {
        /* Mobile: nada a fazer aqui — scroll listener fora do context */

        /* Experiência: sem pin no mobile */
        gsap.set('.exp-slide-2', { clipPath: 'inset(0% 0% 0% 0%)' });
        gsap.set('.exp-slide-3', { clipPath: 'inset(0% 0% 0% 0%)' });
      } else {
        /* Desktop: hero pinado — tudo constrói no scroll */
        const heroTl = gsap.timeline({
          scrollTrigger: {
            trigger: '.l-hero',
            start: 'top top',
            end: '+=150%',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });

        heroTl
          .to('.l-hero__brand',      { opacity: 1, y: 0, duration: 0.6 })
          .to('.l-hero__subtitle',   { opacity: 1, y: 0, duration: 0.4 }, '-=0.1')
          .to('.l-hero__actions',    { opacity: 1, y: 0, duration: 0.4 }, '-=0.1')
          .to('.l-hero__scroll',     { opacity: 1, duration: 0.3 });

        /* Experiência: efeito de janela — desktop apenas */
        gsap.set('.exp-slide-2', { clipPath: 'inset(100% 0% 0% 0%)' });
        gsap.set('.exp-slide-3', { clipPath: 'inset(100% 0% 0% 0%)' });

        const expTl = gsap.timeline({
          scrollTrigger: {
            trigger: '.l-experiencia',
            start: 'top top',
            end: '+=200%',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });

        expTl
          .to('.exp-slide-2', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' }, 0)
          .to('.exp-slide-3', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' }, 1);
      }

      /* Scroll reveals */
      gsap.utils.toArray<HTMLElement>('.rv-up').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 55,
          duration: 1.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 86%', toggleActions: 'play none none none' },
        });
      });

      gsap.utils.toArray<HTMLElement>('.rv-left').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          x: -65,
          duration: 1.3,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none none' },
        });
      });

      gsap.utils.toArray<HTMLElement>('.rv-right').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          x: 65,
          duration: 1.3,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none none' },
        });
      });

      /* Animated counters */
      gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
        const target = parseInt(el.getAttribute('data-count') ?? '0', 10);
        gsap.fromTo(
          el,
          { innerText: 0 },
          {
            innerText: target,
            duration: 2.2,
            ease: 'power2.out',
            snap: { innerText: 1 },
            scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
          },
        );
      });
    }, rootRef);

    /* Mobile: scroll listener fora do gsap.context para cleanup correto */
    let mobileCleanup: (() => void) | null = null;
    if (window.innerWidth <= 768) {
      const revealed = { brand: false, subtitle: false, actions: false };
      const onHeroScroll = () => {
        const y = window.scrollY;
        if (!revealed.brand && y >= 60) {
          revealed.brand = true;
          gsap.to('.l-hero__brand', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' });
        }
        if (!revealed.subtitle && y >= 160) {
          revealed.subtitle = true;
          gsap.to('.l-hero__subtitle', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
        }
        if (!revealed.actions && y >= 280) {
          revealed.actions = true;
          gsap.to('.l-hero__actions', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
          window.removeEventListener('scroll', onHeroScroll);
        }
      };
      window.addEventListener('scroll', onHeroScroll, { passive: true });
      mobileCleanup = () => window.removeEventListener('scroll', onHeroScroll);
    }

    return () => { ctx.revert(); mobileCleanup?.(); };
  }, []);

  /* ── Form submit ─────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState('sending');
    const form = e.currentTarget;
    const payload = {
      nome: (form.elements.namedItem('nome') as HTMLInputElement).value,
      telefone: (form.elements.namedItem('telefone') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      entrada: (form.elements.namedItem('entrada') as HTMLInputElement).value,
    };
    try {
      const params = new URLSearchParams(payload);
      await fetch(
        `https://script.google.com/macros/s/AKfycbwjXB8MzMjkciGsZmXdYUWrxyJkNAcDNq7kxZToEhnGqlxv6jCtbLjeQJkAXIYt49A6/exec?${params}`,
        { mode: 'no-cors' },
      );
    } catch {
      // silencia erros de rede; lead é exibido como enviado
    }
    setFormState('sent');
  };

  /* ── Phone mask ──────────────────────────────────────────── */
  const maskPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d+)$/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/^(\d{2})(\d+)$/, '($1) $2');
    e.target.value = v;
  };

  return (
    <div className="landing" ref={rootRef}>
      {/* ── Navigation ──────────────────────────────────────── */}
      <nav className={`l-nav ${navScrolled ? 'is-scrolled' : ''}`}>
        <a href="#hero" className="l-nav__logo">
          <img src="/logo.png" alt="Morê Nature Spa" className="l-nav__logo-img" />
        </a>
        <div className="l-nav__actions">
          <a href="#contato" className="l-nav__cta">
            Solicitar Apresentação
          </a>
          <a href="https://www.instagram.com/morenatureSpa" target="_blank" rel="noopener noreferrer" className="l-nav__instagram" aria-label="Instagram">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </a>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="l-hero" id="hero">
        <div className="l-hero__bg">
          <img className="hero-stage" src="/etapa4.png" alt="Morê Nature Spa" />
        </div>
        <div className="l-hero__overlay" />

        <div className="l-hero__content">
          <img src="/more.png" alt="Morê Nature Spa" className="l-hero__brand" />
          <p className="l-hero__subtitle">
            Um novo padrão de viver, investir e desacelerar.
          </p>
          <div className="l-hero__actions">
            <a href="#contato" className="btn-gold">Solicitar Apresentação</a>
            <a href="#conceito" className="btn-outline">Conhecer o Projeto</a>
          </div>
        </div>

        <div className="l-hero__scroll">
          <div className="l-hero__scroll-line" />
          <span>Scroll</span>
        </div>
      </section>

      {/* ── Conceito ────────────────────────────────────────── */}
      <section className="l-conceito" id="conceito">
        <div className="l-conceito__text">
          <span className="s-label rv-up">01 · Conceito</span>
          <h2 className="s-title rv-up">
            O Morê nasce em um dos <em>últimos refúgios</em> preservados do Brasil.
          </h2>
          <div className="s-divider rv-up" />
          <p className="s-text rv-up">
            Um projeto pensado para quem valoriza tempo, silêncio e qualidade de vida,
            sem abrir mão de inteligência financeira.
          </p>
          <p className="s-text rv-up" style={{ marginTop: '1.4rem' }}>
            Residências integradas à natureza, com gestão profissional e experiência de resort.
          </p>
        </div>
        <div className="l-conceito__img rv-right">
          <div className="video-wrap">
            <video
              className="conceito-video"
              src="/take08.mp4"
              autoPlay
              muted
              loop
              playsInline
              ref={(el) => { if (el) el.playbackRate = 1; }}
            />
          </div>
        </div>
      </section>

      {/* ── Experiência ─────────────────────────────────────── */}
      <section className="l-experiencia">
        <div className="l-experiencia__bg">
          <img className="exp-slide exp-slide-1" src="/fundo.png"  alt="" />
          <img className="exp-slide exp-slide-2" src="/img2.png"   alt="" />
          <img className="exp-slide exp-slide-3" src="/img3.png"   alt="" />
        </div>
        <div className="l-experiencia__overlay" />
        <div className="l-experiencia__content">
          <span className="s-label rv-up" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>02 · Experiência</span>
          <h2
            className="s-title rv-up experiencia-title"
            style={{ maxWidth: 780, margin: '0 auto 1rem', textAlign: 'center' }}
          >
            Cada detalhe desenhado para <em>equilíbrio</em> perfeito.
          </h2>
          <div className="l-experiencia__features rv-up">
            <div className="feat-item">
              <div className="feat-item__icon">⌂</div>
              <h4>Arquitetura</h4>
              <p>Integrada ao ambiente natural</p>
            </div>
            <div className="feat-item">
              <div className="feat-item__icon">◈</div>
              <h4>Hospitalidade</h4>
              <p>Serviços de alto padrão</p>
            </div>
            <div className="feat-item">
              <div className="feat-item__icon">◯</div>
              <h4>Bem-estar</h4>
              <p>Estilo de vida como filosofia</p>
            </div>
          </div>
        </div>
      </section>


      {/* ── Investimento ────────────────────────────────────── */}
      <section className="l-investimento" id="investimento">
        <div className="rv-left">
          <span className="s-label">03 · Investimento</span>
          <h2 className="s-title">
            Um modelo <em>inteligente</em> que une uso e rentabilidade.
          </h2>
          <div className="s-divider" />
          <p className="s-text" style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
            Investimentos a partir de
          </p>
          <div className="l-investimento__number">
            R$<small></small>250<small> mil</small>
          </div>
          <ul className="inv-list">
            <li>Uso flexível da residência</li>
            <li>Operação profissional de resort</li>
            <li>Potencial de renda via operação hoteleira</li>
            <li>Valorização patrimonial em ativo diferenciado</li>
            <li>Gestão integrada sem esforço do proprietário</li>
          </ul>
        </div>
        <div className="l-investimento__img rv-right">
          <div className="video-wrap">
            <video
              className="conceito-video"
              src="/take09.mp4"
              autoPlay
              muted
              loop
              playsInline
              ref={(el) => { if (el) el.playbackRate = 1; }}
            />
          </div>
        </div>
      </section>


      {/* ── Exclusividade ───────────────────────────────────── */}
      <section className="l-exclusividade">
        <div className="l-exclusividade__img rv-left">
          <div className="deck-slider" onClick={nextSlide}>
            {slides.map((s, i) => (
              <div key={s.label} className="deck-card" style={deckStyles(i)}>
                <img src={s.src} alt={s.label} className="deck-card__img" />
                <span className="deck-card__caption">{s.label}</span>
              </div>
            ))}
          </div>
          <button className="deck-hint" onClick={nextSlide}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span>próximo</span>
          </button>
        </div>
        <div className="rv-right">
          <span className="s-label">04 · Exclusividade</span>
          <h2 className="s-title">
            Um convite <em>para poucos.</em>
          </h2>
          <div className="s-divider" />
          <p className="s-text">
            Projeto de baixa densidade, acesso limitado. O número reduzido de unidades
            não é apenas um diferencial: é o que garante a experiência e valorização
            que prometemos.
          </p>
          <div className="excl-stats">
            <div className="excl-stat">
              <span className="excl-stat__number">+100</span>
              <span className="excl-stat__label">Unidades<br />disponíveis</span>
            </div>
            <div className="excl-stat">
              <span className="excl-stat__number">600m</span>
              <span className="excl-stat__label">Da<br />praia</span>
            </div>
            <div className="excl-stat">
              <span className="excl-stat__number">4</span>
              <span className="excl-stat__label">Elevadores</span>
            </div>
            <div className="excl-stat">
              <span className="excl-stat__number">24hrs</span>
              <span className="excl-stat__label">Recepção</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA + Form ──────────────────────────────────────── */}
      <section className="l-cta" id="contato">
        <div className="l-cta__text rv-left">
          <span className="s-label">Próximo Passo</span>
          <h2 className="s-title">
            Solicite uma <em>apresentação privada</em> e descubra todos os detalhes do Morê.
          </h2>
          <blockquote className="l-cta__quote">
            "Faz sentido para você avançar e eu te apresentar os detalhes completos
            e as melhores posições disponíveis?"
          </blockquote>
          <p className="s-text">
            Nossa equipe entrará em contato para uma conversa personalizada.
            Sem pressão. Apenas a apresentação que você merece.
          </p>
        </div>

        <div className="rv-right">
          <div className="l-form">
            <h3 className="l-form__title">Garanta o seu Morê</h3>
            <p className="l-form__sub">Preencha para receber a apresentação exclusiva</p>

            {formState === 'sent' ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.6rem', color: 'var(--gold)', marginBottom: '1rem' }}>
                  Solicitação recebida.
                </p>
                <p className="s-text" style={{ fontSize: '0.78rem' }}>
                  Nossa equipe entrará em contato em breve com a apresentação exclusiva.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="l-form__group">
                  <label className="l-form__label" htmlFor="nome">Nome completo</label>
                  <input
                    className="l-form__input"
                    type="text"
                    id="nome"
                    name="nome"
                    placeholder="Seu nome"
                    required
                  />
                </div>

                <div className="l-form__group">
                  <label className="l-form__label" htmlFor="telefone">WhatsApp / Telefone</label>
                  <input
                    className="l-form__input"
                    type="tel"
                    id="telefone"
                    name="telefone"
                    placeholder="(00) 00000-0000"
                    onChange={maskPhone}
                    required
                  />
                </div>

                <div className="l-form__group">
                  <label className="l-form__label" htmlFor="email">E-mail</label>
                  <input
                    className="l-form__input"
                    type="email"
                    id="email"
                    name="email"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div className="l-form__group">
                  <label className="l-form__label" htmlFor="entrada">Valor de entrada disponível</label>
                  <input className="l-form__input" id="entrada" name="entrada" type="text" placeholder="Ex: R$ 300 mil" required />
                </div>

                <button
                  type="submit"
                  className={`l-form__btn ${formState === 'sending' ? 'l-form__btn--sent' : ''}`}
                  disabled={formState === 'sending'}
                >
                  {formState === 'sending' ? 'Enviando...' : 'Solicitar Apresentação Privada'}
                </button>

                <p className="l-form__privacy">
                  Seus dados são protegidos e utilizados exclusivamente para contato
                  sobre o Morê Nature Spa.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="l-footer">
        <div className="l-footer__logo">
          <img src="/logo.png" alt="Morê Nature Spa" className="l-footer__logo-img" />
        </div>
        <p className="l-footer__copy">© 2025 Morê Nature Spa. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
