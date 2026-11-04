/**
 * ============================================================
 * بيانات الموقع والأعمال — أحمد مقبل & DOT Media
 * ------------------------------------------------------------
 * كل ما تحتاج تعديله موجود هنا:
 *   SITE_DATA  → المعلومات الشخصية وروابط التواصل
 *   WORK_DATA  → المشاريع المعروضة في قسم الأعمال
 * ============================================================
 */

const SITE_DATA = {
  name: "أحمد مقبل",
  firstName: "أحمد",
  title: "مصمم جرافيك وموشن جرافيك",
  location: "المنصورة، مصر",

  /* سنة بداية المسيرة — سنوات الخبرة تُحسب تلقائيًا منها كل عام */
  careerStart: 2013,

  /* سنة الانضمام إلى بيهانس */
  behanceSince: "2015",

  /* النص التعريفي في قسم البداية */
  lead:
    "من المنصورة، أعمل مصممًا ومختص موشن جرافيك ومؤسسًا لوكالة DOT Media للإنتاج الإبداعي. نبتكر أفكارًا تبدأ من نقطة واحدة لتترك أثرًا تجاريًا ممتدًا لدى العلامات والشركات.",

  /* العبارات التي تتبدّل في سطر الدور (Typing) */
  roles: [
    "// موشن جرافيك — هوية بصرية",
    "// مؤسس وكالة DOT Media",
    "// After Effects & Premiere Pro",
    "// تصميم رقمي وإنتاج إبداعي",
  ],

  agency: {
    name: "DOT Media",
    tagline: "Creative Production",
    url: "https://www.facebook.com/profile.php?id=61581319508233",
    description:
      "وكالة إنتاج إعلامي وإعلاني متكاملة متخصصة في إنتاج المحتوى التجاري وتطوير الهويات البصرية.",
  },

  /* روابط التواصل */
  email: "ahmed01068775125@gmail.com",
  whatsapp: "201228084197",
  behance: "https://www.behance.net/ahmed01068b62e",
  facebook: "https://www.facebook.com/profile.php?id=61581319508233",
  twitter: "https://twitter.com/ahmed0106877",

  /* الأدوات والمهارات */
  tools: [
    "After Effects",
    "Premiere Pro",
    "Photoshop",
    "Illustrator",
    "Cinema 4D",
    "Lightroom",
  ],
  skills: [
    "موشن جرافيك",
    "هوية بصرية",
    "تصميم طباعي",
    "إنتاج إعلامي",
    "سوشيال ميديا",
    "مؤثرات بصرية VFX",
  ],

  /*
   * أرقام قسم الإحصائيات.
   * القيم ذات الـ key تُحسب تلقائيًا:
   *   experience → السنة الحالية ناقص careerStart
   *   behance    → عدد المشاريع التي لها رابط خارجي فعلي
   * القيم الرقمية الثابتة تُعدَّل يدويًا عند الحاجة.
   */
  stats: [
    { key: "experience", suffix: "+", label: "سنوات خبرة" },
    { key: "projects", value: 160, suffix: "+", label: "مشروع منجز" },
    { key: "clients", value: 80, suffix: "+", label: "عميل راضٍ" },
    { key: "behance", suffix: "", label: "مشروع على بيهانس" },
  ],
};

/* التصنيفات المستخدمة في الفلترة */
const CATEGORIES = [
  { id: "all", label: "الكل" },
  { id: "motion", label: "موشن جرافيك" },
  { id: "brand", label: "هوية وطباعة" },
  { id: "digital", label: "تصميم رقمي" },
];

const WORK_DATA = [
  {
    id: "f01",
    code: "F01",
    title: "يوم التأسيس السعودي",
    cat: "motion",
    tag: "موشن جرافيك",
    isVideo: true,
    url: "https://www.behance.net/gallery/244580859/_",
    external: true,
    image: "assets/projects/f01_cover.jpg",
    imageSmall: "assets/projects/f01_cover-900.jpg",
    width: 1072,
    height: 1344,
    summary:
      "عمل بصري بمناسبة يوم التأسيس السعودي لصالح TECHIFAY، يجمع بين التراث السعودي والهوية الخضراء والذهبية في تكوين مهيب.",
  },
  {
    id: "f02",
    code: "F02",
    title: "ابن الباسل",
    cat: "motion",
    tag: "موشن جرافيك",
    isVideo: true,
    url: "https://www.behance.net/gallery/244097521/_",
    external: true,
    image: "assets/projects/f02_cover.png",
    width: 404,
    height: 316,
    summary:
      "فيديو موشن جرافيك يقدّم «ابن الباسل» بأسلوب سينمائي وإيقاع بصري مشدود من أول ثانية.",
  },
  {
    id: "f03",
    code: "F03",
    title: "آنس الدمشقي — إعلان طبق اللحم",
    cat: "motion",
    tag: "إعلان مطعم",
    isVideo: true,
    video: "assets/projects/f03_ans-dimashqi-steak.mp4",
    url: "",
    external: false,
    image: "assets/projects/f03_cover.jpg",
    width: 1200,
    height: 900,
    summary:
      "إعلان طعام لمطعم «آنس الدمشقي»: تصوير للطبق بإضاءة دافئة تُبرز تفاصيل اللحم والصوص والخضار، وينتهي برقم الطلب — إنتاج DOT Media.",
  },
  {
    id: "f04",
    code: "F04",
    title: "أول أعمالي في الموشن جرافيك",
    cat: "motion",
    tag: "موشن جرافيك",
    isVideo: true,
    url: "https://www.behance.net/gallery/119428049/_",
    external: true,
    image: "assets/projects/f04_cover.png",
    width: 404,
    height: 316,
    summary:
      "من أوائل مشاريع الموشن جرافيك التي نفذتها؛ بداية المسار في التحريك والتصميم الحركي.",
  },
  {
    id: "f05",
    code: "F05",
    title: "طاهر للطباعة",
    cat: "brand",
    tag: "هوية وطباعة",
    isVideo: false,
    url: "https://www.behance.net/gallery/128103663/_",
    external: true,
    image: "assets/projects/f05_cover.jpg",
    imageSmall: "assets/projects/f05_cover-900.jpg",
    width: 1400,
    height: 1192,
    summary:
      "هوية بصرية وتصميمات طباعية لمطبعة طاهر، تشمل الشعار والمطبوعات وتطبيقات الهوية.",
  },
  {
    id: "f06",
    code: "F06",
    title: "مركز هارفارد التعليمي",
    cat: "brand",
    tag: "هوية وطباعة",
    isVideo: false,
    url: "https://www.behance.net/gallery/148210723/_",
    external: true,
    image: "assets/projects/f06_cover.jpg",
    width: 404,
    height: 316,
    summary:
      "هوية بصرية لمركز هارفارد التعليمي، مبنية على الوضوح والثقة وسهولة التطبيق في المطبوعات والرقمي.",
  },
  {
    id: "f07",
    code: "F07",
    title: "ULTRA GROW",
    cat: "brand",
    tag: "هوية وطباعة",
    isVideo: false,
    url: "https://www.behance.net/gallery/148215371/ULTRA-GROW",
    external: true,
    image: "assets/projects/f07_cover.jpg",
    imageSmall: "assets/projects/f07_cover-900.jpg",
    width: 1400,
    height: 964,
    summary:
      "هوية بصرية وتغليف لعلامة ULTRA GROW بأسلوب عصري جريء يمنح المنتج حضورًا واضحًا على الرف.",
  },
  {
    id: "f08",
    code: "F08",
    title: "ULTRA GROW 2",
    cat: "brand",
    tag: "هوية وطباعة",
    isVideo: false,
    url: "https://www.behance.net/gallery/194077839/ULTRA-GROW-2",
    external: true,
    image: "assets/projects/f08_cover.jpg",
    imageSmall: "assets/projects/f08_cover-900.jpg",
    width: 1400,
    height: 980,
    summary:
      "تطوير للنظام البصري لعلامة ULTRA GROW وتوسيع تطبيقاته عبر مختلف نقاط التواصل.",
  },
  {
    id: "f09",
    code: "F09",
    title: "تصميمات",
    cat: "digital",
    tag: "تصميم رقمي",
    isVideo: false,
    url: "https://www.behance.net/gallery/228287151/_",
    external: true,
    image: "assets/projects/f09_cover.png",
    width: 404,
    height: 316,
    summary:
      "مجموعة تصميمات رقمية متنوعة أُنتجت لعلامات ومناسبات مختلفة، تجمع بين الوضوح والجاذبية البصرية.",
  },
  {
    id: "f10",
    code: "F10",
    title: "حقن فيلر",
    cat: "digital",
    tag: "تصميم رقمي",
    isVideo: false,
    url: "https://www.behance.net/gallery/194077395/_",
    external: true,
    image: "assets/projects/f10_cover.jpg",
    imageSmall: "assets/projects/f10_cover-900.jpg",
    width: 1400,
    height: 1400,
    summary:
      "تصميم إعلاني لخدمة حقن الفيلر للدكتورة لينا بعّاد، بأسلوب ناعم يعتمد على درجات الوردي وعناصر الطبيعة.",
  },
  {
    id: "f11",
    code: "F11",
    title: "INSTA WATCHES",
    cat: "digital",
    tag: "تصميم رقمي",
    isVideo: false,
    url: "https://www.behance.net/gallery/175994775/INSTA-WATCHES",
    external: true,
    image: "assets/projects/f11_cover.jpg",
    width: 404,
    height: 316,
    summary:
      "تصميمات رقمية لعلامة ساعات، تركّز على إبراز المنتج بإضاءة وتفاصيل فاخرة.",
  },
  {
    id: "f12",
    code: "F12",
    title: "سر الطبيعة",
    cat: "digital",
    tag: "تصميم رقمي",
    isVideo: false,
    url: "https://www.behance.net/gallery/194077227/_",
    external: true,
    image: "assets/projects/f12_cover.jpg",
    width: 404,
    height: 316,
    summary:
      "تصميم إعلاني رقمي يستلهم الطبيعة في تكوين دافئ وجذاب يلفت الانتباه دون ازدحام بصري.",
  },
  {
    id: "f13",
    code: "F13",
    title: "بوابة القبول",
    cat: "brand",
    tag: "تصميم طباعي",
    isVideo: false,
    url: "",
    external: false,
    image: "assets/projects/f13_cover.jpg",
    imageSmall: "assets/projects/f13_cover-900.jpg",
    imageMedium: "assets/projects/f13_cover-1400.jpg",
    width: 2314,
    height: 3069,
    summary:
      "تصميم رول أب لبوابة القبول للالتحاق بالجامعات، يجمع بين الهوية الأكاديمية والوضوح المعلوماتي في قطعة طباعية واحدة.",
  },
  {
    id: "f14",
    code: "F14",
    title: "البدايات — ياسر الحزيمي",
    cat: "motion",
    tag: "موشن جرافيك",
    isVideo: true,
    video: "assets/projects/f14_beginnings-yasser.mp4",
    url: "",
    external: false,
    image: "assets/projects/f14_cover.jpg",
    width: 1200,
    height: 900,
    summary:
      "فيلم موشن جرافيك قصير بعنوان «البدايات» يقدّم الفكرة بأسلوب رسومي دافئ: شخصية تشكّل إناءً من الطين، في بناء بصري هادئ يرمز إلى بداية الطريق وصناعة الشيء باليد.",
  },
  {
    id: "f15",
    code: "F15",
    title: "ألهاكم التكاثر — الشيخ أمجد سمير",
    cat: "motion",
    tag: "موشن جرافيك",
    isVideo: true,
    video: "assets/projects/f15_alhakum-altakathur.mp4",
    url: "",
    external: false,
    image: "assets/projects/f15_cover.jpg",
    width: 1200,
    height: 900,
    summary:
      "عمل موشن جرافيك بعنوان «ألهاكم التكاثر» للشيخ أمجد سمير، يجسّد المعنى في مشاهد متتابعة: الجري خلف المال، ثم الثراء والاستقرار، ثم لحظة الصفاء والرجوع — بأسلوب ثلاثي الأبعاد وإضاءة دافئة.",
  },
  {
    id: "f16",
    code: "F16",
    title: "EN-SERV — تحريك شعار",
    cat: "motion",
    tag: "تحريك شعار",
    isVideo: true,
    video: "assets/projects/f16_logo-reveal.mp4",
    url: "",
    external: false,
    image: "assets/projects/f16_cover.jpg",
    width: 1200,
    height: 900,
    summary:
      "تحريك شعار EN-SERV: مونوجرام هندسي يتبلور من خطوط ضوئية على خلفية داكنة، وينتهي بظهور الاسم في مشهد إغلاق نظيف.",
  },
  {
    id: "f17",
    code: "F17",
    title: "الزين — مطعم سوري",
    cat: "motion",
    tag: "تصوير ومونتاج",
    isVideo: true,
    video: "assets/projects/f17_elzain-restaurant.mp4",
    url: "",
    external: false,
    image: "assets/projects/f17_cover.jpg",
    width: 1200,
    height: 900,
    summary:
      "فيديو تعريفي لمطعم «الزين» السوري: لقطات من داخل المطعم تبرز الشيف والطبق الرئيسي والهوية الحمراء، بمونتاج سريع مناسب للسوشيال ميديا.",
  },
  {
    id: "f18",
    code: "F18",
    title: "المقصود للمولدات — إعلان الشركة",
    cat: "motion",
    tag: "إعلان شركة",
    isVideo: true,
    video: "assets/projects/f18_elmaqsoud-generators.mp4",
    url: "",
    external: false,
    image: "assets/projects/f18_cover.jpg",
    width: 1200,
    height: 900,
    summary:
      "إعلان شركة المقصود لتوريد المولدات: عرض للمعدات ولوحات التحكم في تكوين ثلاثي الأبعاد يعرّف بالخدمة ويختم برابط الموقع.",
  },
  {
    id: "f19",
    code: "F19",
    title: "بديل — إعلان سيارة",
    cat: "motion",
    tag: "إعلان سيارات",
    isVideo: true,
    video: "assets/projects/f19_bdeel-car.mp4",
    url: "",
    external: false,
    image: "assets/projects/f19_cover.jpg",
    width: 1200,
    height: 900,
    summary:
      "إعلان سيارة لعلامة «بديل» بأسلوب سينمائي: إضاءة درامية، حركة كاميرا قريبة، وخلفية خطوط ضوئية تمنح المشهد إحساسًا بالسرعة والفخامة.",
  },
  {
    id: "f20",
    code: "F20",
    title: "الوثبة العقارية — مشروع سكني",
    cat: "motion",
    tag: "إعلان عقاري",
    isVideo: true,
    video: "assets/projects/f20_alwathba-building.mp4",
    url: "",
    external: false,
    image: "assets/projects/f20_cover.jpg",
    width: 1200,
    height: 900,
    summary:
      "إعلان لمشروع سكني لشركة «الوثبة» العقارية: جولة بصرية على واجهات المبنى وتفاصيله، بإطار جرافيكي وخلفية داكنة تُبرز الهوية.",
  },
  {
    id: "f21",
    code: "F21",
    title: "آنس الدمشقي — إعلان الفطيرة",
    cat: "motion",
    tag: "إعلان مطعم",
    isVideo: true,
    video: "assets/projects/f21_ans-dimashqi-pie.mp4",
    url: "",
    external: false,
    image: "assets/projects/f21_cover.jpg",
    width: 1200,
    height: 900,
    summary:
      "إعلان طعام ثانٍ لمطعم «آنس الدمشقي»: الفطيرة باللحم والمكونات المتطايرة حولها على خلفية برتقالية، بأسلوب دعائي مباشر ينتهي برقم الطلب.",
  },
];
