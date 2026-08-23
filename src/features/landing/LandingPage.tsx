import { useLayoutEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HERO_FRAME_COUNT, containRect, frameIndexFromProgress, framePath, scaleRect, shiftRect, shouldRenderModel } from '../../lib/frameScrub';
import { shouldNavBeSolid } from '../../lib/navSolid';
import './landing.css';

gsap.registerPlugin(ScrollTrigger);

/* Quanto o frame desenhado desliza para a direita, em fração da largura.
   O vídeo põe a maquete em 3%–53% do quadro; deslocar 44% a leva para
   47%–97%, liberando a metade esquerda para a marca e os CTAs. */
/* Centraliza a maquete no espaço que sobra à direita do texto. O texto termina
   em ~45% da largura, então o centro dessa faixa livre fica em ~72%; com 0.46
   a maquete ia parar em 78% e encostava na borda direita. */
const HERO_SHIFT = 0.395;

/* Reduz a maquete para ela não subir até a faixa do header, onde passaria por
   trás do botão de CTA. */
const HERO_SCALE = 0.82;

/* Desce a maquete um pouco, liberando a altura do header por completo. */
const HERO_DROP = 0.05;


/* Endpoint público do bff: resolve o operador da vez, insere o lead na planilha
   (sheet=google) e responde 302 pro WhatsApp. */
const MOSU_COMPANY_ID = '01KS35KZ5QTH5RQ0Q115KXT016';
const MOSU_FUNNEL_ID = '01KVT1NFGDM98FQE7M4N7A4AJZ';
const WHATSAPP_REDIRECT_URL =
  `https://api.mosu.com.br/api/public/companies/${MOSU_COMPANY_ID}/funnels/${MOSU_FUNNEL_ID}/current-operator/url`;

const formatEntrada = (raw: string) => {
  const n = Number(raw);
  return raw && !Number.isNaN(n) ? `R$ ${n.toLocaleString('pt-BR')}` : raw;
};

const buildWhatsappMessage = (nome: string, entrada: string) =>
  `Olá! Sou ${nome} e vim pelo site da Morevie. Gostaria de receber a apresentação privada.\n\n` +
  `Valor de entrada disponível: ${formatEntrada(entrada)}`;

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const paintedRef = useRef(-1);
  const repaintRef = useRef<(() => void) | null>(null);
  const progressRef = useRef(0);
  const [navScrolled, setNavScrolled] = useState(false);
  const [formState, setFormState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [formFilled, setFormFilled] = useState(false);
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

  /* ── Frames da maquete ───────────────────────────────────
     Pré-carrega a sequência para o scrub trocar de frame sem ir à rede.
     Sem isso o primeiro passe pela hero fica emperrado, porque cada frame
     só aparece depois de baixar. */
  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* No celular a maquete não é desenhada, então os 3,8 MB de frames não
       chegam a sair da rede. */
    if (!shouldRenderModel(window.innerWidth, reduced)) return;
    let cancelled = false;
    framesRef.current = [];
    for (let i = 0; i < HERO_FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = framePath(i);
      img.onload = () => {
        if (cancelled) return;
        framesRef.current[i] = img;
        /* Repinta a cada chegada: o canvas pode estar mostrando um vizinho
           escolhido como substituto enquanto este ainda vinha da rede. */
        repaintRef.current?.();
      };
    }
    return () => { cancelled = true; };
  }, []);

  /* ── Nav scroll state ────────────────────────────────────── */
  useLayoutEffect(() => {
    /* A hero fica pinada por 150% da tela enquanto a maquete se constrói.
       O limiar tem de ser o fim desse trecho, não os 60px de sempre: a barra
       sólida do nav é mais escura que a hero e risca uma faixa por cima dela. */
    const heroEnd = () => {
      const hero = document.querySelector('.l-hero');
      if (!hero || window.innerWidth <= 768) return null;
      return window.innerHeight * 1.5;
    };
    const onScroll = () => setNavScrolled(shouldNavBeSolid(window.scrollY, heroEnd()));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  /* ── GSAP Animations ─────────────────────────────────────── */
  useLayoutEffect(() => {
    /* Desenha o frame num canvas em vez de trocar o src de uma <img>:
       reatribuir src limpa o quadro antes de pintar o novo, e a cada passo do
       scrub isso aparece como piscada. drawImage escreve por cima, sem apagar. */
    const paintFrame = (progress: number, force = false) => {
      const canvas = stageRef.current;
      if (!canvas) return;
      if (!shouldRenderModel(window.innerWidth, false)) return;
      progressRef.current = progress;
      const index = frameIndexFromProgress(progress, HERO_FRAME_COUNT);
      if (index === paintedRef.current && !force) return;

      /* Enquanto a sequência carrega, cai no frame decodificado mais próximo:
         sem isso a hero fica vazia no primeiro passe. */
      let img = framesRef.current[index];
      if (!img) {
        for (let d = 1; d < HERO_FRAME_COUNT; d++) {
          img = framesRef.current[index - d] ?? framesRef.current[index + d];
          if (img) break;
        }
      }
      if (!img) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* Os frames vêm com alfa (scripts/keyout-bg.py), então o canvas só
         limpa: quem pinta o fundo é o CSS da hero. Foi isso que soltou a hero
         da cor do vídeo e permitiu o fundo claro. */
      ctx.clearRect(0, 0, w, h);

      const fit = scaleRect(containRect(img.naturalWidth, img.naturalHeight, w, h), HERO_SCALE);
      const box = shiftRect(fit, w, HERO_SHIFT);
      ctx.drawImage(img, box.x, box.y + h * HERO_DROP, box.width, box.height);
      paintedRef.current = index;
    };

    /* O preload e o resize precisam repintar o frame corrente. */
    repaintRef.current = () => paintFrame(progressRef.current, true);
    const onResize = () => paintFrame(progressRef.current, true);
    window.addEventListener('resize', onResize);
    paintFrame(0, true);

    const ctx = gsap.context(() => {
      const isMobile = window.innerWidth <= 768;

      /* Marca, tagline e botões ficam visíveis desde o primeiro paint: quem
         chega precisa ver quem é e o que fazer sem depender de rolar. Só a
         maquete se constrói com o scroll. */
      gsap.set('.l-hero__brand',      { opacity: 1, y: 0 });
      gsap.set('.l-hero__subtitle',   { opacity: 1, y: 0 });
      gsap.set('.l-hero__actions',    { opacity: 1, y: 0 });
      gsap.set('.l-hero__scroll',     { opacity: 0 });

      if (isMobile) {
        /* Mobile: a hero é só a marca e os botões, sem maquete para animar. */

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
            /* As etapas são pintadas direto do progresso, e não por tweens
               encadeados: a mistura precisa somar 1 em qualquer ponto, senão
               a hero escurece no meio de cada transição. */
            onUpdate: ({ progress }) => paintFrame(progress),
          },
        });

        heroTl.to('.l-hero__scroll', { opacity: 1, duration: 0.3 });

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


    return () => {
      ctx.revert();
      window.removeEventListener('resize', onResize);
      repaintRef.current = null;
    };
  }, []);

  /* ── Form submit ─────────────────────────────────────────── */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    // valida os campos obrigatórios (nome, telefone, email, entrada) antes de prosseguir
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setFormState('sending');

    // abre a aba de forma síncrona (dentro do gesto de clique) para escapar do bloqueador de pop-up
    const waWindow = window.open('', '_blank');

    const nome = (form.elements.namedItem('nome') as HTMLInputElement).value;
    const telefone = (form.elements.namedItem('telefone') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const entrada = (form.elements.namedItem('entrada') as HTMLInputElement).value;
    const hp = (form.elements.namedItem('hp') as HTMLInputElement).value;

    // o bff resolve o operador, insere o lead na planilha (sheet=google) e
    // redireciona (302) pro WhatsApp com a mensagem montada aqui.
    const params = new URLSearchParams({
      sheet: 'google',
      text: buildWhatsappMessage(nome, entrada),
      nome,
      telefone,
      email,
      entrada,
      hp,
    });
    const url = `${WHATSAPP_REDIRECT_URL}?${params}`;
    if (waWindow) waWindow.location.href = url;
    else window.location.href = url;

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

  const onlyNumbers = (e: React.FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '');
  };

  return (
    <div className="landing" ref={rootRef}>
      {/* ── Navigation ──────────────────────────────────────── */}
      <nav className={`l-nav ${navScrolled ? 'is-scrolled' : ''}`}>
        <a href="#hero" className="l-nav__logo">
          <img src="/logo-nav.png" alt="Morê Nature Spa" className="l-nav__logo-img" />
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
          <canvas
            ref={stageRef}
            className="hero-stage"
            role="img"
            aria-label="Maquete do Morê Nature Spa sendo construída, da fundação ao empreendimento pronto"
          />
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

        {/* Onda de saída da hero. SVG estático: sem JS, sem animação por frame
            e sem custo de runtime — a hero já paga um canvas por scroll.
            Preenchimento em gradiente, não cor chapada: faixas sólidas
            empilhadas liam como degraus em vez de água. */}
        <svg
          className="l-hero__wave"
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="ondaA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8ad2e8" stopOpacity="0" />
              <stop offset="100%" stopColor="#8ad2e8" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="ondaB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#86cfae" stopOpacity="0" />
              <stop offset="100%" stopColor="#86cfae" stopOpacity="0.42" />
            </linearGradient>
            <linearGradient id="ondaC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Amplitudes e comprimentos diferentes em cada camada: cristas
              alinhadas é o que fazia o conjunto parecer um degrau só. */}
          <path
            fill="url(#ondaA)"
            d="M0,96 C160,52 300,44 470,74 C650,106 780,138 960,128 C1120,119 1290,84 1440,58 L1440,200 L0,200 Z"
          />
          <path
            fill="url(#ondaB)"
            d="M0,124 C200,92 340,124 520,142 C700,160 840,140 1010,124 C1180,108 1320,116 1440,132 L1440,200 L0,200 Z"
          />
          <path
            fill="url(#ondaC)"
            d="M0,150 C180,132 300,164 500,170 C690,176 820,150 1000,148 C1190,146 1330,164 1440,158 L1440,200 L0,200 Z"
          />
          <path
            className="l-hero__wave-fill"
            d="M0,176 C220,164 380,190 580,192 C780,194 900,172 1080,170 C1250,168 1360,184 1440,180 L1440,200 L0,200 Z"
          />
        </svg>
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
              <form onSubmit={handleSubmit} onChange={(e) => setFormFilled(e.currentTarget.checkValidity())}>
                <input type="text" name="hp" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
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
                    inputMode="numeric"
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
                  <input className="l-form__input" id="entrada" name="entrada" type="text" inputMode="numeric" placeholder="Ex: R$ 300.000" onInput={onlyNumbers} required />
                </div>

                <button
                  type="submit"
                  className={`l-form__btn ${formState === 'sending' ? 'l-form__btn--sent' : ''}`}
                  disabled={!formFilled || formState === 'sending'}
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
