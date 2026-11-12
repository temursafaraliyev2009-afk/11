// src/components/HelpModal.jsx
import React, { useState, useEffect } from 'react';
import { ModalPortal } from './ModalPortal';
import {
  X,
  HelpCircle,
  Package,
  ShoppingCart,
  Receipt,
  ShoppingBag,
  BarChart3,
  Users,
  Copy,
  Check,
  ExternalLink,
  Info,
  Phone,
  Wallet,
  CalendarClock,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Banknote,
  BookOpen,
  DollarSign
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export const HelpModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();

  // Uchala mavzuni aniqlash: Kunduzgi, Kechki/Shomgi, Tungi
  // Qat'iy yorqinlik tartibi: KUNDUZGI (eng to'q va sokin) < SHOMGI (o'rtacha yorqin) < TUNGI (eng yorqin va ravshan)
  const isNight = theme === 'night';
  const isTwilight = theme === 'twilight';
  const isDay = !isNight && !isTwilight; // Default: Kunduzgi

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('guides'); // 'guides' | 'finance' | 'troubleshooting' | 'faq' | 'contact'
  const [expandedFaq, setExpandedFaq] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText('+998 91 883 07 02');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navTabs = [
    { id: 'guides', label: 'Qo‘llanma', icon: BookOpen },
    { id: 'finance', label: 'Moliya & To‘lovlar', icon: Banknote },
    { id: 'troubleshooting', label: 'Xatolar & Yechimlar', icon: ShieldAlert },
    { id: 'faq', label: 'Savol-Javoblar (FAQ)', icon: HelpCircle },
    { id: 'contact', label: 'Bog‘lanish', icon: Phone },
  ];

  const guides = [
    {
      id: 'inventory',
      title: 'Mahsulotlar va omborni boshqarish',
      icon: Package,
      points: [
        'Yangi mahsulot kiritish: "Ombor" sahifasida "Yangi mahsulot" tugmasi bosiladi. Nomi, toifasi, o‘lchov birligi, sotish narxi, tannarxi va soni kiritiladi. Kiyim-kechak do‘konida qo‘shimcha o‘lcham (size), rang va jins kiritiladi.',
        'Tahrirlash va narxlarni yangilash: Mahsulot qatoridagi tahrirlash (qalamcha) tugmasi orqali narx yoki miqdor istalgan payt yangilanadi. Bu hisobotlardagi ombor qiymatiga bir zumda aks etadi.',
        'Zaxira qoldig‘i nazorati: Tovar sotilganda ombor qoldig‘i avtomatik kamayadi. Qoldiq kamaysa "Kam", zaxira 0 bo‘lsa "Tugagan" deb belgilanadi.'
      ]
    },
    {
      id: 'sales',
      title: 'Savdo va kassa operatsiyalari',
      icon: ShoppingCart,
      points: [
        'Tezkor savdo (Kassa): "Savdo" menyusida mahsulotlar savatga qo‘shiladi, miqdor belgilanadi va to‘lov turi tanlanadi: Naqd, Karta yoki Nasiya (ruxsat etilgan do‘konlarda).',
        'Chegirma va chek: Umumiy savdo summasidan chegirma ajratish va savdo yakunlangach kassa chekini chop etish mumkin.',
        'Savdolar tarixi: Barcha amalga oshirilgan savdolar vaqti, to‘lov usuli va xodim nomi bilan arxivlanadi. Qaytarilgan savdolar alohida belgilanadi.'
      ]
    },
    {
      id: 'debts',
      title: 'Qarzlar (Nasiya daftari)',
      icon: Receipt,
      points: [
        'Qarzlar hisobi: Oziq-ovqat va boshqa nasiyaga mos do‘konlarda ishlaydi. Xaridor ismi, telefoni, qarz summasi va qaytarish muddati yoziladi.',
        'To‘lov qabul qilish: Mijoz qarzni to‘laganda "To‘lov kiritish" tugmasi bosiladi. To‘langan summa qarzni yopadi va kassaning haqiqiy pul kirimiga qo‘shiladi.',
        'Muddati o‘tgan qarzlar: To‘lov sanasi kechikkan qarzdorlar alohida qizil nishon bilan ko‘rsatiladi.'
      ]
    },
    {
      id: 'installments',
      title: 'Muddatli to‘lov (Bo‘lib to‘lash)',
      icon: Wallet,
      points: [
        'Shartnoma tuzish: Telefon, Kiyim-kechak, Qurilish mollari, Uy-ro‘zg‘or va Sport do‘konlarida amal qiladi. Mijoz tanlanadi, tovarlar qo‘shiladi, boshlang‘ich to‘lov va to‘lov soni (oylik/yillik) belgilanadi.',
        'Avtomatik grafik: To‘lovlar jadvali (Schedule) sanalar bo‘yicha avtomatik taqsimlanadi. Qolgan qarz har bir to‘lovdan keyin aniq hisoblab boriladi.',
        'Kiyim parametrlari: Kiyimlar do‘konida shartnomaga mahsulotning o‘lchami (razmeri) va rangi avtomatik biriktiriladi.'
      ]
    },
    {
      id: 'rentals',
      title: 'Ijara (Arenda xizmati)',
      icon: CalendarClock,
      points: [
        'Ijaraga berish: Uy-ro‘zg‘or, Sport, Aksessuarlar va Telefon do‘konlarida buyum va anjomlarni ijaraga berish imkoniyati.',
        'Muddat va to‘lov nazorati: Boshlanish va qaytarish sanasi, kunlik yoki oylik ijara haqi belgilanadi.',
        'Qaytarish va yopish: Buyum do‘konga qaytarilganda "Qaytarildi" holatiga o‘tkaziladi.'
      ]
    },
    {
      id: 'staff',
      title: 'Xodimlar va rollarni boshqarish',
      icon: Users,
      points: [
        'Do‘kon egasi (Admin / Owner): Barcha moliyaviy ko‘rsatkichlar, sof foyda/zarar, xodimlarni taklif qilish va tizim sozlamalarini to‘liq boshqaradi.',
        'Sotuvchi (Employee / Seller): Faqat savdo qilish, kassa va omborni ko‘rish huquqiga ega. Maxfiy hisobotlar va xodimlar boshqaruvi unga ko‘rinmaydi.',
        'Xodim taklif qilish: "Xodimlar" bo‘limida taklifnoma havolasi yoki email orqali yangi sotuvchilar biriktiriladi.'
      ]
    }
  ];

  const financialPoints = [
    {
      title: 'Tovar tushumi (Realizatsiya) vs Kassa kirimi',
      desc: 'Tovar tushumi — do‘kondan chiqib ketgan tovarlarning to‘liq sotuv qiymati (jumladan muddatli to‘lov shartnomalari). Kassa kirimi esa aynan o‘sha kuni kassaga haqiqatda kelib tushgan naqd pul va karta to‘lovlaridir.',
      icon: DollarSign
    },
    {
      title: 'Boshlang‘ich to‘lov, keyingi to‘lov va qolgan qarz',
      desc: 'Masalan: 1 200 000 so‘mlik tovar 300 000 so‘m boshlang‘ich to‘lov bilan sotilsa, bugungi kassa kirimiga faqat 300 000 so‘m qo‘shiladi (1 200 000 so‘m emas!). Qolgan 900 000 so‘m mijoz keyingi to‘lovlarni to‘lagan kunlarning kassa kirimiga bosqichma-bosqich qo‘shiladi.',
      icon: Banknote
    },
    {
      title: 'Tannarx (COGS) va Yalpi foyda hisobi',
      desc: 'Yalpi foyda = Tovar tushumi - Haqiqiy tannarx. Agar tovarning tannarxi kiritilmagan bo‘lsa, u hisobotlarda "Tannarxsiz" sifatida alohida ajratiladi, bu moliyaviy hisob-kitoblar aniqligini saqlaydi.',
      icon: BarChart3
    },
    {
      title: 'Davr filtrlari (Bugun, Hafta, Oy, Yil)',
      desc: 'Barcha grafiklar, ko‘rsatkichlar va jadvallar tanlangan davrga muvofiq filtrlangan haqiqiy savdo amallari asosida real vaqt rejimida dinamik qayta hisoblanadi.',
      icon: CalendarClock
    }
  ];

  const troubleshootingPoints = [
    {
      title: '1. "Omborda tovar yetarli emas" xabari',
      cause: 'Sotilayotgan miqdor ombordagi mavjud qoldiqdan oshib ketganda chiqadi.',
      solution: 'Ombor bo‘limiga o‘tib, tegishli mahsulotning haqiqiy qoldig‘ini tahrirlash orqali to‘g‘rilang. Eski mahsulotni o‘chirib tashlamang.',
      type: 'warning'
    },
    {
      title: '2. To‘lov summasini qoldiqdan ortiq kiritish',
      cause: 'Mijoz qarzidan ko‘proq summa kiritilganda tizim xavfsizlik maqsadida to‘lovni qabul qilmaydi.',
      solution: 'Mijozning haqiqiy qoldiq qarz summasini tekshiring va to‘lovni shu miqdordan oshirmasdan kiriting.',
      type: 'warning'
    },
    {
      title: '3. Do‘kon almashtirganda ma’lumotlar yo‘qolgandek ko‘rinishi',
      cause: 'Savatchi har bir do‘kon ma’lumotlarini (Ombor, Savdo, Qarzlar) bir-biridan to‘liq izolyatsiya qilgan holda saqlaydi.',
      solution: 'Yuqori paneldagi do‘kon nomini bosib, kerakli do‘konga qayting. Barcha ma’lumotlaringiz o‘z o‘rnida xavfsiz saqlanmoqda.',
      type: 'info'
    },
    {
      title: '4. Shartnomani bekor qilish va tovarni omborga qaytarish',
      cause: 'Xaridor tovarni qaytarib berganida ombor qoldig‘ini to‘g‘rilash zarurati.',
      solution: 'Shartnomani bekor qilish oynasida "Tovarlarni omborga qaytarish" belgisini yoqsangiz, ombor qoldig‘i avtomatik tiklanadi.',
      type: 'info'
    }
  ];

  const faqs = [
    {
      q: 'Savatchi tizimi qaysi qurilmalarda ishlaydi?',
      a: 'Savatchi to‘liq moslashuvchan (responsive) tizim bo‘lib, shaxsiy kompyuterlar, noutbuklar, planshetlar va har qanday smartfonlarda qulay ishlaydi.'
    },
    {
      q: 'Nega kiyimlar yoki telefon do‘konida "Qarzlar" menyusi yo‘q?',
      a: 'Kiyim-kechak va Telefon kabi do‘konlarda xavfli og‘zaki qarzlar o‘rniga to‘lov jadvali va boshlang‘ich to‘lovni nazorat qiluvchi qulay "Muddatli to‘lov" tizimi joriy etilgan.'
    },
    {
      q: 'Boshlang‘ich to‘lov to‘g‘ridan-to‘g‘ri kassaga qo‘shiladimi?',
      a: 'Ha, shartnoma tuzilgan zahoti qabul qilingan boshlang‘ich to‘lov aynan o‘sha kunning haqiqiy kassa tushumiga kiritiladi. Qolgan summa esa keyingi to‘lovlar qabul qilingan paytda kassaga qo‘shiladi.'
    },
    {
      q: 'Xodimlar mening sof foyda va moliyaviy hisobotlarimni ko‘ra oladimi?',
      a: 'Yo‘q. "Sotuvchi" (Employee) sifatida biriktirilgan xodimlar faqat savdo qilish, kassa va omborni ko‘ra oladi. Sof foyda, zarar, xarajatlar va xodimlar boshqaruvi faqat do‘kon egasiga (Owner) ko‘rinadi.'
    },
    {
      q: 'Bir nechta do‘konni bitta hisobdan boshqarsa bo‘ladimi?',
      a: 'Ha, Savatchi ko‘p do‘konli (Multi-Store) tizimni qo‘llab-quvvatlaydi. Yuqori paneldagi do‘kon nomi orqali istalgan do‘konga bir zumda o‘tishingiz mumkin.'
    },
    {
      q: 'Hisobotlar va statistika qachon yangilanadi?',
      a: 'Har bir savdo amalga oshirilganda, yangi tovar kiritilganda yoki to‘lov qabul qilinganda hisobotlar real vaqt rejimida bir zumda avtomatik qayta hisoblanadi.'
    }
  ];

  // ─── 3 TA MAVZU UCHUN QAT'IY YORQINLIK TARTIBI: ──────────────────────────────
  // 1. KUNDUZGI: Eng to'q va sokin neytral palitra (#0F172A / #1E293B / #2D3B4F)
  // 2. SHOMGI (KECHKI): Kunduzgidan biroz yorqinroq, muvozanatli (#1E293B / #2B394E / #40536E)
  // 3. TUNGI: Shomgidan ham yorqinroq, aniq va ravshan (#334155 / #3B4C66 / #5B708F)
  const modalStyles = {
    // Dialog oynasi tashqi qobig'i (KUNDUZGI: #0F172A < SHOMGI: #1E293B < TUNGI: #334155)
    dialog: isDay
      ? 'bg-[#0F172A] border-[#2D3B4F] text-[#F1F5F9] shadow-2xl'
      : isTwilight
      ? 'bg-[#1E293B] border-[#40536E] text-[#F8FAFC] shadow-2xl'
      : 'bg-[#334155] border-[#5B708F] text-white shadow-2xl',

    // Sarlavha paneli (KUNDUZGI: #162032 < SHOMGI: #243247 < TUNGI: #35455E)
    header: isDay
      ? 'bg-[#162032] border-[#2D3B4F]'
      : isTwilight
      ? 'bg-[#243247] border-[#40536E]'
      : 'bg-[#35455E] border-[#5B708F]',
    headerTitle: isDay ? 'text-[#F1F5F9]' : isTwilight ? 'text-[#F8FAFC]' : 'text-white',
    headerSubtitle: isDay ? 'text-[#94A3B8]' : isTwilight ? 'text-[#CBD5E1]' : 'text-[#E2E8F0]',
    closeBtn: isDay
      ? 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/10'
      : isTwilight
      ? 'text-[#CBD5E1] hover:text-white hover:bg-white/15'
      : 'text-[#E2E8F0] hover:text-white hover:bg-white/20',

    // Navigatsiya menyusi paneli (KUNDUZGI: #0A101D < SHOMGI: #192334 < TUNGI: #29374D)
    tabBar: isDay
      ? 'bg-[#0A101D] border-[#2D3B4F]'
      : isTwilight
      ? 'bg-[#192334] border-[#40536E]'
      : 'bg-[#29374D] border-[#5B708F]',
    tabTrack: isDay
      ? 'bg-[#162032] border-[#2D3B4F]'
      : isTwilight
      ? 'bg-[#222F43] border-[#40536E]'
      : 'bg-[#33435C] border-[#5B708F]',
    tabActive: isDay
      ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/30'
      : isTwilight
      ? 'bg-blue-500 text-white shadow-sm shadow-blue-800/40'
      : 'bg-blue-400 text-slate-900 shadow-md shadow-blue-500/30 font-black',
    tabInactive: isDay
      ? 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/10'
      : isTwilight
      ? 'text-[#CBD5E1] hover:text-white hover:bg-white/15'
      : 'text-[#E2E8F0] hover:text-white hover:bg-white/20',

    // Asosiy ichki kartalar (KUNDUZGI: #1E293B < SHOMGI: #2B394E < TUNGI: #3B4C66)
    contentCard: isDay
      ? 'bg-[#1E293B] border-[#2D3B4F] hover:border-blue-500/40 shadow-xs'
      : isTwilight
      ? 'bg-[#2B394E] border-[#40536E] hover:border-blue-400/50 shadow-xs'
      : 'bg-[#3B4C66] border-[#5B708F] hover:border-blue-300/70 shadow-xs',
    cardTitle: isDay ? 'text-[#F1F5F9]' : isTwilight ? 'text-[#F8FAFC]' : 'text-white',
    cardText: isDay ? 'text-[#CBD5E1]' : isTwilight ? 'text-[#E2E8F0]' : 'text-[#FFFFFF]',

    // Kirish (Savatchi haqida) kartasi
    introCard: isDay
      ? 'bg-[#1E293B] border border-blue-900/60 shadow-xs'
      : isTwilight
      ? 'bg-[#2B394E] border border-blue-600/50 shadow-xs'
      : 'bg-[#3B4C66] border border-blue-400/70 shadow-xs',
    introTitle: isDay ? 'text-blue-400' : isTwilight ? 'text-blue-300' : 'text-blue-200',
    introText: isDay ? 'text-[#CBD5E1]' : isTwilight ? 'text-[#E2E8F0]' : 'text-[#FFFFFF]',

    // Moliya bo'limi ogohlantirish banneri
    financeBanner: isDay
      ? 'bg-amber-950/45 border border-amber-900/60 text-amber-300'
      : isTwilight
      ? 'bg-amber-900/40 border border-amber-600/55 text-amber-200'
      : 'bg-amber-800/40 border border-amber-400/75 text-amber-100',
    financeBannerText: isDay ? 'text-amber-200/90' : isTwilight ? 'text-amber-100' : 'text-amber-50',

    // Xatolar & Yechimlar banneri va bloklari
    troubleBanner: isDay
      ? 'bg-blue-950/45 border border-blue-900/60 text-blue-300'
      : isTwilight
      ? 'bg-blue-900/40 border border-blue-600/55 text-blue-200'
      : 'bg-blue-800/40 border border-blue-400/75 text-blue-100',
    troubleBannerText: isDay ? 'text-blue-200/90' : isTwilight ? 'text-blue-100' : 'text-blue-50',
    troubleCause: isDay
      ? 'bg-rose-950/50 border border-rose-900/60 text-rose-200'
      : isTwilight
      ? 'bg-rose-900/45 border border-rose-600/55 text-rose-100'
      : 'bg-rose-800/45 border border-rose-400/75 text-rose-50',
    troubleSolution: isDay
      ? 'bg-emerald-950/50 border border-emerald-900/60 text-emerald-200'
      : isTwilight
      ? 'bg-emerald-900/45 border border-emerald-600/55 text-emerald-100'
      : 'bg-emerald-800/45 border border-emerald-400/75 text-emerald-50',

    // FAQ savol-javob akordeoni
    faqItem: isDay
      ? 'bg-[#1E293B] border-[#2D3B4F] shadow-xs'
      : isTwilight
      ? 'bg-[#2B394E] border-[#40536E] shadow-xs'
      : 'bg-[#3B4C66] border-[#5B708F] shadow-xs',
    faqBtn: isDay
      ? 'text-[#F1F5F9] hover:text-blue-400'
      : isTwilight
      ? 'text-[#F8FAFC] hover:text-blue-300'
      : 'text-white hover:text-blue-200',
    faqBadge: isDay
      ? 'bg-blue-950/80 text-blue-300 border border-blue-800/70'
      : isTwilight
      ? 'bg-blue-600/35 text-blue-200 border border-blue-500/60'
      : 'bg-blue-500/45 text-blue-100 border border-blue-300/80',
    faqAnswer: isDay
      ? 'bg-[#162032] border-t border-[#2D3B4F] text-[#CBD5E1]'
      : isTwilight
      ? 'bg-[#222F43] border-t border-[#40536E] text-[#E2E8F0]'
      : 'bg-[#33435C] border-t border-[#5B708F] text-[#FFFFFF]',

    // Bog'lanish bloki
    contactCard: isDay
      ? 'bg-[#1E293B] border-[#2D3B4F] shadow-xs'
      : isTwilight
      ? 'bg-[#2B394E] border-[#40536E] shadow-xs'
      : 'bg-[#3B4C66] border-[#5B708F] shadow-xs',
    contactTitle: isDay ? 'text-[#F1F5F9]' : isTwilight ? 'text-[#F8FAFC]' : 'text-white',
    contactSubtitle: isDay ? 'text-[#94A3B8]' : isTwilight ? 'text-[#CBD5E1]' : 'text-[#E2E8F0]',
    contactPhoneRow: isDay
      ? 'bg-[#162032] border-[#2D3B4F] text-[#F1F5F9]'
      : isTwilight
      ? 'bg-[#222F43] border-[#40536E] text-[#F8FAFC]'
      : 'bg-[#33435C] border-[#5B708F] text-white',
    copyBtn: isDay
      ? 'bg-white/10 hover:bg-white/15 text-[#CBD5E1]'
      : isTwilight
      ? 'bg-white/15 hover:bg-white/20 text-[#E2E8F0]'
      : 'bg-white/20 hover:bg-white/30 text-white',
    directNote: isDay ? 'text-[#94A3B8]' : isTwilight ? 'text-[#CBD5E1]' : 'text-[#E2E8F0]'
  };

  // Ikonkalar uchun mavzuga mos va yorqinlik ierarxiyasiga mos badge uslublari
  const getGuideBadgeStyle = (id) => {
    switch (id) {
      case 'inventory':
        return isDay
          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/70'
          : isTwilight
          ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/55'
          : 'bg-emerald-500/35 text-emerald-100 border-emerald-300/80';
      case 'sales':
        return isDay
          ? 'bg-blue-950/60 text-blue-300 border-blue-800/70'
          : isTwilight
          ? 'bg-blue-500/25 text-blue-200 border-blue-500/55'
          : 'bg-blue-500/35 text-blue-100 border-blue-300/80';
      case 'debts':
        return isDay
          ? 'bg-amber-950/60 text-amber-300 border-amber-800/70'
          : isTwilight
          ? 'bg-amber-500/25 text-amber-200 border-amber-500/55'
          : 'bg-amber-500/35 text-amber-100 border-amber-300/80';
      case 'installments':
        return isDay
          ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/70'
          : isTwilight
          ? 'bg-indigo-500/25 text-indigo-200 border-indigo-500/55'
          : 'bg-indigo-500/35 text-indigo-100 border-indigo-300/80';
      case 'rentals':
        return isDay
          ? 'bg-rose-950/60 text-rose-300 border-rose-800/70'
          : isTwilight
          ? 'bg-rose-500/25 text-rose-200 border-rose-500/55'
          : 'bg-rose-500/35 text-rose-100 border-rose-300/80';
      case 'staff':
      default:
        return isDay
          ? 'bg-purple-950/60 text-purple-300 border-purple-800/70'
          : isTwilight
          ? 'bg-purple-500/25 text-purple-200 border-purple-500/55'
          : 'bg-purple-500/35 text-purple-100 border-purple-300/80';
    }
  };

  const getFinanceBadgeStyle = (idx) => {
    switch (idx) {
      case 0:
        return isDay
          ? 'bg-blue-950/60 text-blue-300 border-blue-800/70'
          : isTwilight
          ? 'bg-blue-500/25 text-blue-200 border-blue-500/55'
          : 'bg-blue-500/35 text-blue-100 border-blue-300/80';
      case 1:
        return isDay
          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/70'
          : isTwilight
          ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/55'
          : 'bg-emerald-500/35 text-emerald-100 border-emerald-300/80';
      case 2:
        return isDay
          ? 'bg-purple-950/60 text-purple-300 border-purple-800/70'
          : isTwilight
          ? 'bg-purple-500/25 text-purple-200 border-purple-500/55'
          : 'bg-purple-500/35 text-purple-100 border-purple-300/80';
      case 3:
      default:
        return isDay
          ? 'bg-amber-950/60 text-amber-300 border-amber-800/70'
          : isTwilight
          ? 'bg-amber-500/25 text-amber-200 border-amber-500/55'
          : 'bg-amber-500/35 text-amber-100 border-amber-300/80';
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-sans select-none animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className={`rounded-3xl w-full max-w-3xl max-h-[92vh] border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 transition-colors ${modalStyles.dialog}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 transition-colors ${modalStyles.header}`}>
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-black text-base sm:text-lg leading-tight ${modalStyles.headerTitle}`}>
                  {t('help', 'Yordam va qo‘llab-quvvatlash')}
                </h3>
                <p className={`text-xs font-semibold mt-0.5 ${modalStyles.headerSubtitle}`}>
                  Savatchi tizimidan to‘g‘ri va xavfsiz foydalanish bo‘yicha to‘liq qo‘llanma
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${modalStyles.closeBtn}`}
              aria-label={t('close', 'Yopish')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs Bar */}
          <div className={`px-6 pt-3 pb-2 border-b shrink-0 transition-colors ${modalStyles.tabBar}`}>
            <div className={`flex items-center gap-1.5 p-1 rounded-2xl border overflow-x-auto scrollbar-none transition-colors ${modalStyles.tabTrack}`}>
              {navTabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      isActive ? modalStyles.tabActive : modalStyles.tabInactive
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(92vh-140px)]">
            {/* ── TAB 1: GUIDES ────────────────────────────────────────────── */}
            {activeTab === 'guides' && (
              <div className="space-y-4">
                {/* Intro Card */}
                <div className={`rounded-2xl p-4 sm:p-4.5 border transition-colors ${modalStyles.introCard}`}>
                  <div className={`flex items-center space-x-2 font-black text-xs uppercase tracking-wider mb-1.5 ${modalStyles.introTitle}`}>
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{t('aboutTitle', 'Savatchi haqida')}</span>
                  </div>
                  <p className={`text-xs sm:text-sm leading-relaxed font-normal ${modalStyles.introText}`}>
                    {t('aboutDesc', '“Savatchi — kichik va o‘rta do‘konlarni boshqarishni osonlashtiruvchi zamonaviy web-sayt. U mahsulotlar va ombor qoldig‘ini nazorat qilish, savdolarni hisobga olish, qarzlarni boshqarish, muddatli to‘lov, buyurtmalarni kuzatish hamda hisobotlarni ko‘rishga yordam beradi.”')}
                  </p>
                </div>

                {/* Guides List */}
                <div className="space-y-3">
                  {guides.map((item) => {
                    const Icon = item.icon;
                    const badgeStyle = getGuideBadgeStyle(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all space-y-2.5 ${modalStyles.contentCard}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 border ${badgeStyle}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <h4 className={`font-black text-xs sm:text-sm ${modalStyles.cardTitle}`}>
                            {item.title}
                          </h4>
                        </div>
                        <ul className="space-y-1.5 pl-2 text-xs">
                          {item.points.map((pt, idx) => (
                            <li key={idx} className={`flex items-start gap-2 leading-relaxed ${modalStyles.cardText}`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${isDay ? 'bg-blue-400' : isTwilight ? 'bg-blue-300' : 'bg-blue-200'}`} />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TAB 2: FINANCE ───────────────────────────────────────────── */}
            {activeTab === 'finance' && (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border transition-colors ${modalStyles.financeBanner}`}>
                  <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Moliyaviy hisob-kitoblar qoidalari</span>
                  </h4>
                  <p className={`text-xs leading-relaxed font-semibold ${modalStyles.financeBannerText}`}>
                    Savatchi moliyaviy hisobotlari haqiqiy tovar realizatsiyasi va haqiqiy kassa tushumini qat’iy farqlaydi. Bu orqali hisobotlarda tushum sun’iy ravishda ko‘payib ketmaydi.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {financialPoints.map((item, idx) => {
                    const Icon = item.icon;
                    const badgeStyle = getFinanceBadgeStyle(idx);
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border space-y-2 transition-all ${modalStyles.contentCard}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${badgeStyle}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <h5 className={`font-extrabold text-xs sm:text-sm leading-snug ${modalStyles.cardTitle}`}>
                            {item.title}
                          </h5>
                        </div>
                        <p className={`text-xs leading-relaxed font-medium ${modalStyles.cardText}`}>
                          {item.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TAB 3: TROUBLESHOOTING ────────────────────────────────────── */}
            {activeTab === 'troubleshooting' && (
              <div className="space-y-3.5">
                <div className={`p-4 rounded-2xl border transition-colors ${modalStyles.troubleBanner}`}>
                  <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 mb-1">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Xavfsiz foydalanish va xatolarni to‘g‘rilash</span>
                  </h4>
                  <p className={`text-xs leading-relaxed font-semibold ${modalStyles.troubleBannerText}`}>
                    Muammo yuzaga kelganda hech qachon ma’lumotlarni o‘chirmang yoki moliyaviy amallarni tekshirmasdan takrorlamang. Quyidagi xavfsiz qadamlardan foydalaning.
                  </p>
                </div>

                <div className="space-y-3">
                  {troubleshootingPoints.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border space-y-2.5 transition-all ${modalStyles.contentCard}`}
                    >
                      <h5 className={`font-black text-xs sm:text-sm ${modalStyles.cardTitle}`}>
                        {item.title}
                      </h5>
                      <div className="text-xs space-y-2">
                        <div className={`flex items-start gap-2 p-2.5 rounded-xl border transition-colors ${modalStyles.troubleCause}`}>
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-bold">Sabab:</strong> {item.cause}
                          </div>
                        </div>
                        <div className={`flex items-start gap-2 p-2.5 rounded-xl border transition-colors ${modalStyles.troubleSolution}`}>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-bold">Xavfsiz yechim:</strong> {item.solution}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 4: FAQ ───────────────────────────────────────────────── */}
            {activeTab === 'faq' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h4 className={`font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 ${modalStyles.cardTitle}`}>
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span>Tez-tez beriladigan savollar</span>
                  </h4>
                  <span className={`text-[11px] font-bold ${isDay ? 'text-[#94A3B8]' : isTwilight ? 'text-[#CBD5E1]' : 'text-[#E2E8F0]'}`}>
                    {faqs.length} ta savol
                  </span>
                </div>

                <div className="space-y-2.5">
                  {faqs.map((faq, idx) => {
                    const isExpanded = expandedFaq === idx;
                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl border overflow-hidden transition-all ${modalStyles.faqItem}`}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                          className={`w-full flex items-center justify-between p-3.5 sm:p-4 text-left font-extrabold text-xs sm:text-sm cursor-pointer transition-colors gap-3 ${modalStyles.faqBtn}`}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className={`w-5 h-5 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 ${modalStyles.faqBadge}`}>
                              {idx + 1}
                            </span>
                            <span>{faq.q}</span>
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 opacity-80 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 opacity-80 shrink-0" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className={`px-4 pb-4 pt-2.5 text-xs leading-relaxed font-medium transition-colors ${modalStyles.faqAnswer}`}>
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TAB 5: CONTACT ───────────────────────────────────────────── */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className={`rounded-2xl p-5 border space-y-4 transition-colors ${modalStyles.contactCard}`}>
                  <div>
                    <h4 className={`font-black text-sm flex items-center gap-2 ${modalStyles.contactTitle}`}>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#229ED9]"></span>
                      <span>{t('contactTitle', 'Men bilan bog‘lanish')}</span>
                    </h4>
                    <p className={`text-xs font-medium mt-1 leading-relaxed ${modalStyles.contactSubtitle}`}>
                      {t('contactSubtitle', 'Savol, taklif yoki texnik yordam uchun bevosita Telegram orqali yozishingiz mumkin.')}
                    </p>
                  </div>

                  {/* Kontakt ma'lumoti & nusxa olish */}
                  <div className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border transition-colors ${modalStyles.contactPhoneRow}`}>
                    <div className="flex items-center space-x-2.5">
                      <Phone className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-black tracking-wide">
                        +998 91 883 07 02
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {copied && (
                        <span className={`text-[11px] font-black animate-in fade-in ${isDay ? 'text-emerald-400' : isTwilight ? 'text-emerald-300' : 'text-emerald-200'}`}>
                          {t('copied', 'Nusxa olindi!')}
                        </span>
                      )}
                      <button
                        onClick={handleCopyPhone}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${modalStyles.copyBtn}`}
                        title={t('copyPhoneTitle', 'Raqamdan nusxa olish')}
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 opacity-80" />
                        )}
                        <span>{copied ? 'Olingan' : 'Nusxa'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Telegram orqali bog‘lanish tugmasi */}
                  <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <a
                      href="https://t.me/+998918830702"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center space-x-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#229ED9] to-[#1a8bc4] hover:from-[#1e8ec5] hover:to-[#167db0] text-white font-black text-xs sm:text-sm shadow-md shadow-sky-500/25 active:scale-95 transition-all duration-150 cursor-pointer whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.95-1.28 4.92-2.13 5.9-2.54 2.81-1.17 3.4-1.37 3.78-1.38.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                      </svg>
                      <span>{t('contactBtn', 'Telegram orqali bog‘lanish')}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80 shrink-0" />
                    </a>

                    <span className={`text-[11px] font-medium text-center sm:text-left leading-relaxed ${modalStyles.directNote}`}>
                      {t('contactDirectNote', 'Telefon raqam orqali to‘g‘ridan-to‘g‘ri Telegram chat ochiladi')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
