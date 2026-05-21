import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ImagePlaceholder } from './components/ImagePlaceholder'; // usado nas demais seções
import './landing.css';

gsap.registerPlugin(ScrollTrigger);

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const [formState, setFormState] = useState<'idle' | 'sending' | 'sent'>('idle');

  /* ── Cursor tracking ─────────────────────────────────────── */
  useLayoutEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
      if (cursorRingRef.current) {
        gsap.to(cursorRingRef.current, {
          left: e.clientX,
          top: e.clientY,
          duration: 0.25,
          ease: 'power2.out',
        });
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  /* ── Nav scroll state ────────────────────────────────────── */
  useLayoutEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── GSAP Animations ─────────────────────────────────────── */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      /* Hero: estado inicial */
      gsap.set('.hero-letter',      { clipPath: 'inset(100% 0% 0% 0%)', y: 50, opacity: 0 });
      gsap.set('.l-hero__tagline',  { opacity: 0, y: 16 });
      gsap.set('.l-hero__subtitle', { opacity: 0, y: 16 });
      gsap.set('.l-hero__actions',  { opacity: 0, y: 16 });
      gsap.set('.l-hero__scroll',   { opacity: 0 });

      /* Hero: pinado — letras constroem de baixo para cima no scroll */
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.l-hero',
          start: 'top top',
          end: '+=120%',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      heroTl
        .to('.hero-letter', {
          clipPath: 'inset(-20% 0% 0% 0%)',
          y: 0,
          opacity: 1,
          stagger: 0.2,
          duration: 0.8,
          ease: 'power3.out',
        })
        .to('.l-hero__tagline',  { opacity: 1, y: 0, duration: 0.4 }, '-=0.2')
        .to('.l-hero__subtitle', { opacity: 1, y: 0, duration: 0.4 }, '-=0.2')
        .to('.l-hero__actions',  { opacity: 1, y: 0, duration: 0.4 }, '-=0.15')
        .to('.l-hero__scroll',   { opacity: 1, duration: 0.3 });

      /* Experiência: efeito de janela — 3 imagens reveladas de baixo para cima */
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

    return () => ctx.revert();
  }, []);

  /* ── Form submit ─────────────────────────────────────────── */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState('sending');
    setTimeout(() => setFormState('sent'), 1600);
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
      {/* Cursor */}
      <div className="l-cursor" ref={cursorRef} />
      <div className="l-cursor-ring" ref={cursorRingRef} />

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
          <span className="l-hero__tagline">Nature Spa · Brasil</span>
          <div className="l-hero__title" aria-label="Morê">
            <span className="hero-letter hero-m">M</span>
            <span className="hero-letter hero-o">O</span>
            <span className="hero-letter hero-r">R</span>
            <span className="hero-letter hero-e">Ê</span>
          </div>
          <p className="l-hero__subtitle">
            Um novo padrão de viver, investir e desacelerar.
          </p>
          <div className="l-hero__actions">
            <a href="#contato" className="btn-gold hide-on-mobile">Solicitar Apresentação</a>
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
          {/* SUBSTITUA: vista aérea do empreendimento */}
          <ImagePlaceholder label="Exclusividade — Vista aérea / Implantação do projeto" />
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
              <span className="excl-stat__number" data-count="30">0</span>
              <span className="excl-stat__label">Unidades<br />limitadas</span>
            </div>
            <div className="excl-stat">
              <span className="excl-stat__number" data-count="100">0</span>
              <span className="excl-stat__label">Hectares de<br />natureza</span>
            </div>
            <div className="excl-stat">
              <span className="excl-stat__number" data-count="1">0</span>
              <span className="excl-stat__label">Único<br />empreendimento</span>
            </div>
            <div className="excl-stat">
              <span className="excl-stat__number">24/7</span>
              <span className="excl-stat__label">Gestão<br />profissional</span>
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
                  <div style={{ position: 'relative' }}>
                    <select className="l-form__select" id="entrada" name="entrada" defaultValue="" required>
                      <option value="" disabled>Selecione sua faixa</option>
                      <option value="250-500k">R$ 250 mil a R$ 500 mil</option>
                      <option value="500k-1m">R$ 500 mil a R$ 1 milhão</option>
                      <option value="1m-2m">R$ 1 milhão a R$ 2 milhões</option>
                      <option value="2m+">Acima de R$ 2 milhões</option>
                    </select>
                    <span className="l-form__select-arrow">▾</span>
                  </div>
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
