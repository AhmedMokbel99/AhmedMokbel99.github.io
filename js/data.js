/**
 * ملف مولّد آليًا من content/*.json بواسطة build.py
 * لا تعدّله يدويًا — عدّل المحتوى من لوحة التحكم أو من ملفات content.
 */

const SITE_DATA = {
  "name": "أحمد مقبل",
  "firstName": "أحمد",
  "title": "مصمم جرافيك وموشن جرافيك",
  "location": "المنصورة، محافظة الدقهلية",
  "careerStart": 2013,
  "behanceSince": "2015",
  "lead": "من المنصورة، أنا مصمم جرافيك وموشن جرافيك ومؤسس وكالة DOT Media. أصنع هويات بصرية وإعلانات فيديو لمطاعم وشركات وعيادات — من الفكرة والسيناريو حتى الملف الجاهز للنشر.",
  "roles": [
    "موشن جرافيك وهوية بصرية",
    "إعلانات فيديو للمطاعم والشركات",
    "After Effects وPremiere Pro",
    "تصميم رقمي جاهز للطباعة والنشر"
  ],
  "agency": {
    "name": "DOT Media",
    "tagline": "Creative Production",
    "url": "https://www.facebook.com/profile.php?id=61581319508233",
    "description": "وكالة إنتاج إعلامي وإعلاني متكاملة متخصصة في إنتاج المحتوى التجاري وتطوير الهويات البصرية."
  },
  "email": "ahmed01068775125@gmail.com",
  "whatsapp": "201228084197",
  "behance": "https://www.behance.net/ahmed01068b62e",
  "facebook": "https://www.facebook.com/profile.php?id=61581319508233",
  "twitter": "https://x.com/ahmed0106877",
  "tools": [
    "After Effects",
    "Premiere Pro",
    "Photoshop",
    "Illustrator",
    "Cinema 4D",
    "Lightroom"
  ],
  "skills": [
    "موشن جرافيك",
    "هوية بصرية",
    "تصميم طباعي",
    "إنتاج إعلامي",
    "سوشيال ميديا",
    "مؤثرات بصرية VFX"
  ],
  "stats": [
    {
      "key": "experience",
      "suffix": "+",
      "label": "سنوات خبرة"
    },
    {
      "key": "projects",
      "value": 160,
      "suffix": "+",
      "label": "مشروع منجز"
    },
    {
      "key": "clients",
      "value": 80,
      "suffix": "+",
      "label": "عميل راضٍ"
    },
    {
      "key": "selected",
      "suffix": "",
      "label": "مشروع مختار من مسيرتي"
    }
  ]
};

const CATEGORIES = [
  {
    "id": "all",
    "label": "الكل"
  },
  {
    "id": "motion",
    "label": "موشن جرافيك"
  },
  {
    "id": "brand",
    "label": "هوية وطباعة"
  },
  {
    "id": "digital",
    "label": "تصميم رقمي"
  }
];

const WORK_DATA = [
  {
    "id": "f24",
    "code": "F01",
    "title": "هارفارد 2026 — هوية العام الجديد",
    "cat": "brand",
    "tag": "هوية وطباعة",
    "isVideo": false,
    "url": "",
    "external": false,
    "image": "assets/projects/project-f24.jpg",
    "imageSmall": "assets/projects/project-f24-900.jpg",
    "width": 1600,
    "height": 1600,
    "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة",
    "summary": "هوية بصرية لمركز هارفارد التعليمي، مبنية على الوضوح والثقة وسهولة التطبيق في المطبوعات والرقمي. 2026",
    "details": "مشروع تصميم الهوية والمواد البصرية لمركز هارفارد التعليمي لعام 2026، بهدف تقديم صورة احترافية وعصرية تعكس قوة المركز ودوره في تقديم خدمات تعليمية متخصصة للطلاب.\n\nالهدف من التصميم:\nبناء حضور بصري قوي ومميز للمركز، يعكس جودة الخدمات التعليمية، ويمنح العلامة التجارية مظهراً احترافياً يليق بمؤسسة تعليمية حديثة في عام 2026\n.",
    "facts": [
      {
        "label": "سنة المشروع",
        "value": "2026"
      },
      {
        "label": "المجال",
        "value": "التعليم والتدريب"
      },
      {
        "label": "نوع المشروع",
        "value": "Branding & Graphic Design"
      },
      {
        "label": "الخدمات",
        "value": "الهوية البصرية – التصميم الإعلاني – المواد التسويقية – المحتوى البصري"
      }
    ],
    "visible": true,
    "video": "",
    "youtube": "",
    "gallery": [
      {
        "src": "assets/projects/project-f24-g1.jpg",
        "small": "assets/projects/project-f24-g1-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g2.jpg",
        "small": "assets/projects/project-f24-g2-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g3.jpg",
        "small": "assets/projects/project-f24-g3-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g4.jpg",
        "small": "assets/projects/project-f24-g4-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g5.jpg",
        "small": "assets/projects/project-f24-g5-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g6.jpg",
        "small": "assets/projects/project-f24-g6-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g7.jpg",
        "small": "assets/projects/project-f24-g7-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g8.jpg",
        "small": "assets/projects/project-f24-g8-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g9.jpg",
        "small": "assets/projects/project-f24-g9-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g10.jpg",
        "small": "assets/projects/project-f24-g10-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g11.jpg",
        "small": "assets/projects/project-f24-g11-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g12.jpg",
        "small": "assets/projects/project-f24-g12-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g13.jpg",
        "small": "assets/projects/project-f24-g13-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g14.jpg",
        "small": "assets/projects/project-f24-g14-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g15.jpg",
        "small": "assets/projects/project-f24-g15-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g16.jpg",
        "small": "assets/projects/project-f24-g16-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g17.jpg",
        "small": "assets/projects/project-f24-g17-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      },
      {
        "src": "assets/projects/project-f24-g18.jpg",
        "small": "assets/projects/project-f24-g18-900.jpg",
        "width": 1600,
        "height": 1600,
        "alt": "مركز هارفارد التعليمي 2026 — هوية وطباعة"
      }
    ]
  },
  {
    "id": "f01",
    "code": "F02",
    "title": "يوم التأسيس السعودي",
    "cat": "motion",
    "tag": "موشن جرافيك",
    "isVideo": true,
    "url": "https://www.behance.net/gallery/244580859/_",
    "external": true,
    "image": "assets/projects/saudi-founding-day-motion-graphic.jpg",
    "imageSmall": "assets/projects/saudi-founding-day-motion-graphic-900.jpg",
    "width": 1072,
    "height": 1344,
    "summary": "عمل بصري بمناسبة يوم التأسيس السعودي لصالح TECHIFAY، يجمع بين التراث السعودي والهوية الخضراء والذهبية في تكوين مهيب.",
    "alt": "يوم التأسيس السعودي — موشن جرافيك"
  },
  {
    "id": "f02",
    "code": "F03",
    "title": "ابن الباسل",
    "cat": "motion",
    "tag": "موشن جرافيك",
    "isVideo": true,
    "url": "https://www.behance.net/gallery/244097521/_",
    "external": true,
    "image": "assets/projects/ibn-albasel-motion-graphic.jpg",
    "width": 404,
    "height": 316,
    "summary": "فيديو موشن جرافيك يقدّم «ابن الباسل» بأسلوب سينمائي وإيقاع بصري مشدود من أول ثانية.",
    "alt": "ابن الباسل — موشن جرافيك",
    "imageSmall": "assets/projects/ibn-albasel-motion-graphic-900.jpg"
  },
  {
    "id": "f03",
    "code": "F04",
    "title": "آنس الدمشقي — إعلان طبق اللحم",
    "cat": "motion",
    "tag": "إعلان مطعم",
    "isVideo": true,
    "video": "assets/projects/f03_ans-dimashqi-steak.mp4",
    "url": "",
    "external": false,
    "image": "assets/projects/ans-dimashqi-steak-ad.jpg",
    "width": 1200,
    "height": 900,
    "summary": "إعلان طعام لمطعم «آنس الدمشقي»: تصوير للطبق بإضاءة دافئة تُبرز تفاصيل اللحم والصوص والخضار، وينتهي برقم الطلب — إنتاج DOT Media.",
    "alt": "آنس الدمشقي — إعلان طبق اللحم — إعلان مطعم",
    "imageSmall": "assets/projects/ans-dimashqi-steak-ad-900.jpg"
  },
  {
    "id": "f04",
    "code": "F05",
    "title": "أول أعمالي في الموشن جرافيك",
    "cat": "motion",
    "tag": "موشن جرافيك",
    "isVideo": true,
    "url": "https://www.behance.net/gallery/119428049/_",
    "external": true,
    "image": "assets/projects/first-motion-graphics-work.jpg",
    "width": 404,
    "height": 316,
    "summary": "من أوائل مشاريع الموشن جرافيك التي نفذتها؛ بداية المسار في التحريك والتصميم الحركي.",
    "alt": "أول أعمالي في الموشن جرافيك — موشن جرافيك",
    "imageSmall": "assets/projects/first-motion-graphics-work-900.jpg"
  },
  {
    "id": "f05",
    "code": "F06",
    "title": "طاهر للطباعة",
    "cat": "brand",
    "tag": "هوية وطباعة",
    "isVideo": false,
    "url": "https://www.behance.net/gallery/128103663/_",
    "external": true,
    "image": "assets/projects/taher-printing-brand-identity.jpg",
    "imageSmall": "assets/projects/taher-printing-brand-identity-900.jpg",
    "width": 1400,
    "height": 1192,
    "summary": "هوية بصرية وتصميمات طباعية لمطبعة طاهر، تشمل الشعار والمطبوعات وتطبيقات الهوية.",
    "alt": "طاهر للطباعة — هوية وطباعة"
  },
  {
    "id": "f06",
    "code": "F07",
    "title": "هارفارد — الهوية البصرية الأساسية",
    "cat": "brand",
    "tag": "هوية وطباعة",
    "isVideo": false,
    "url": "https://www.behance.net/gallery/148210723/_",
    "external": true,
    "image": "assets/projects/harvard-education-center-brand.jpg",
    "width": 404,
    "height": 316,
    "summary": "هوية بصرية لمركز هارفارد التعليمي، مبنية على الوضوح والثقة وسهولة التطبيق في المطبوعات والرقمي.",
    "details": "مشروع تصميم الهوية والمواد البصرية لمركز هارفارد التعليمي لعام 2023، بهدف تقديم صورة احترافية وعصرية تعكس قوة المركز ودوره في تقديم خدمات تعليمية متخصصة للطلاب.\n\nالهدف من التصميم:\nبناء حضور بصري قوي ومميز للمركز، يعكس جودة الخدمات التعليمية، ويمنح العلامة التجارية مظهراً احترافياً يليق بمؤسسة تعليمية حديثة في عام 2023.",
    "facts": [
      {
        "label": "سنة المشروع",
        "value": "2023"
      },
      {
        "label": "المجال",
        "value": "التعليم والتدريب"
      },
      {
        "label": "نوع المشروع",
        "value": "Branding & Graphic Design"
      },
      {
        "label": "الخدمات",
        "value": "الهوية البصرية – التصميم الإعلاني – المواد التسويقية – المحتوى البصري"
      }
    ],
    "gallery": [],
    "alt": "مركز هارفارد التعليمي — هوية وطباعة",
    "imageSmall": "assets/projects/harvard-education-center-brand-900.jpg"
  },
  {
    "id": "f07",
    "code": "F08",
    "title": "ULTRA GROW — تغليف المنتجات",
    "cat": "brand",
    "tag": "هوية وطباعة",
    "isVideo": false,
    "url": "https://www.behance.net/gallery/148215371/ULTRA-GROW",
    "external": true,
    "image": "assets/projects/ultra-grow-brand-packaging.jpg",
    "imageSmall": "assets/projects/ultra-grow-brand-packaging-900.jpg",
    "width": 1400,
    "height": 964,
    "summary": "هوية بصرية وتغليف لعلامة ULTRA GROW بأسلوب عصري جريء يمنح المنتج حضورًا واضحًا على الرف.",
    "alt": "ULTRA GROW — تغليف المنتجات — هوية وطباعة"
  },
  {
    "id": "f08",
    "code": "F09",
    "title": "ULTRA GROW — النظام البصري",
    "cat": "brand",
    "tag": "هوية وطباعة",
    "isVideo": false,
    "url": "https://www.behance.net/gallery/194077839/ULTRA-GROW-2",
    "external": true,
    "image": "assets/projects/ultra-grow-2-brand-system.jpg",
    "imageSmall": "assets/projects/ultra-grow-2-brand-system-900.jpg",
    "width": 1400,
    "height": 980,
    "summary": "تطوير للنظام البصري لعلامة ULTRA GROW وتوسيع تطبيقاته عبر مختلف نقاط التواصل.",
    "alt": "ULTRA GROW — النظام البصري — هوية وطباعة"
  },
  {
    "id": "f09",
    "code": "F10",
    "title": "تصميمات سوشيال ميديا — مختارات",
    "cat": "digital",
    "tag": "تصميم رقمي",
    "isVideo": false,
    "url": "https://www.behance.net/gallery/228287151/_",
    "external": true,
    "image": "assets/projects/social-media-design-collection.jpg",
    "width": 404,
    "height": 316,
    "summary": "مجموعة تصميمات رقمية متنوعة أُنتجت لعلامات ومناسبات مختلفة، تجمع بين الوضوح والجاذبية البصرية.",
    "alt": "تصميمات سوشيال ميديا — مختارات — تصميم رقمي",
    "imageSmall": "assets/projects/social-media-design-collection-900.jpg"
  },
  {
    "id": "f10",
    "code": "F11",
    "title": "حقن فيلر",
    "cat": "digital",
    "tag": "تصميم رقمي",
    "isVideo": false,
    "url": "https://www.behance.net/gallery/194077395/_",
    "external": true,
    "image": "assets/projects/filler-injection-ad-design.jpg",
    "imageSmall": "assets/projects/filler-injection-ad-design-900.jpg",
    "width": 1400,
    "height": 1400,
    "summary": "تصميم إعلاني لخدمة حقن الفيلر للدكتورة لينا بعّاد، بأسلوب ناعم يعتمد على درجات الوردي وعناصر الطبيعة.",
    "alt": "حقن فيلر — تصميم رقمي"
  },
  {
    "id": "f11",
    "code": "F12",
    "title": "INSTA WATCHES",
    "cat": "digital",
    "tag": "تصميم رقمي",
    "isVideo": false,
    "url": "https://www.behance.net/gallery/175994775/INSTA-WATCHES",
    "external": true,
    "image": "assets/projects/insta-watches-ad-design.jpg",
    "width": 404,
    "height": 316,
    "summary": "تصميمات رقمية لعلامة ساعات، تركّز على إبراز المنتج بإضاءة وتفاصيل فاخرة.",
    "alt": "INSTA WATCHES — تصميم رقمي",
    "imageSmall": "assets/projects/insta-watches-ad-design-900.jpg"
  },
  {
    "id": "f12",
    "code": "F13",
    "title": "سر الطبيعة",
    "cat": "digital",
    "tag": "تصميم رقمي",
    "isVideo": false,
    "url": "https://www.behance.net/gallery/194077227/_",
    "external": true,
    "image": "assets/projects/nature-secret-ad-design.jpg",
    "width": 404,
    "height": 316,
    "summary": "تصميم إعلاني رقمي يستلهم الطبيعة في تكوين دافئ وجذاب يلفت الانتباه دون ازدحام بصري.",
    "alt": "سر الطبيعة — تصميم رقمي",
    "imageSmall": "assets/projects/nature-secret-ad-design-900.jpg"
  },
  {
    "id": "f13",
    "code": "F14",
    "title": "بوابة القبول",
    "cat": "brand",
    "tag": "تصميم طباعي",
    "isVideo": false,
    "url": "",
    "external": false,
    "image": "assets/projects/admission-gateway-rollup.jpg",
    "imageSmall": "assets/projects/admission-gateway-rollup-900.jpg",
    "imageMedium": "assets/projects/admission-gateway-rollup-1400.jpg",
    "width": 1508,
    "height": 2000,
    "summary": "تصميم رول أب لبوابة القبول للالتحاق بالجامعات، يجمع بين الهوية الأكاديمية والوضوح المعلوماتي في قطعة طباعية واحدة.",
    "alt": "بوابة القبول — تصميم طباعي"
  },
  {
    "id": "f14",
    "code": "F15",
    "title": "البدايات — ياسر الحزيمي",
    "cat": "motion",
    "tag": "موشن جرافيك",
    "isVideo": true,
    "video": "assets/projects/f14_beginnings-yasser.mp4",
    "url": "",
    "external": false,
    "image": "assets/projects/beginnings-motion-graphic.jpg",
    "width": 1200,
    "height": 900,
    "summary": "فيلم موشن جرافيك قصير بعنوان «البدايات» يقدّم الفكرة بأسلوب رسومي دافئ: شخصية تشكّل إناءً من الطين، في بناء بصري هادئ يرمز إلى بداية الطريق وصناعة الشيء باليد.",
    "alt": "البدايات — ياسر الحزيمي — موشن جرافيك",
    "imageSmall": "assets/projects/beginnings-motion-graphic-900.jpg"
  },
  {
    "id": "f15",
    "code": "F16",
    "title": "ألهاكم التكاثر — الشيخ أمجد سمير",
    "cat": "motion",
    "tag": "موشن جرافيك",
    "isVideo": true,
    "video": "assets/projects/f15_alhakum-altakathur.mp4",
    "url": "",
    "external": false,
    "image": "assets/projects/alhakum-altakathur-motion.jpg",
    "width": 1200,
    "height": 900,
    "summary": "عمل موشن جرافيك بعنوان «ألهاكم التكاثر» للشيخ أمجد سمير، يجسّد المعنى في مشاهد متتابعة: الجري خلف المال، ثم الثراء والاستقرار، ثم لحظة الصفاء والرجوع — بأسلوب ثلاثي الأبعاد وإضاءة دافئة.",
    "alt": "ألهاكم التكاثر — الشيخ أمجد سمير — موشن جرافيك",
    "imageSmall": "assets/projects/alhakum-altakathur-motion-900.jpg"
  },
  {
    "id": "f16",
    "code": "F17",
    "title": "EN-SERV — تحريك شعار",
    "cat": "motion",
    "tag": "تحريك شعار",
    "isVideo": true,
    "video": "assets/projects/f16_logo-reveal.mp4",
    "url": "",
    "external": false,
    "image": "assets/projects/en-serv-logo-animation.jpg",
    "width": 1200,
    "height": 900,
    "summary": "تحريك شعار EN-SERV: مونوجرام هندسي يتبلور من خطوط ضوئية على خلفية داكنة، وينتهي بظهور الاسم في مشهد إغلاق نظيف.",
    "alt": "EN-SERV — تحريك شعار",
    "imageSmall": "assets/projects/en-serv-logo-animation-900.jpg"
  },
  {
    "id": "f17",
    "code": "F18",
    "title": "الزين — مطعم سوري",
    "cat": "motion",
    "tag": "تصوير ومونتاج",
    "isVideo": true,
    "video": "assets/projects/f17_elzain-restaurant.mp4",
    "url": "",
    "external": false,
    "image": "assets/projects/elzain-restaurant-video.jpg",
    "width": 1200,
    "height": 900,
    "summary": "فيديو تعريفي لمطعم «الزين» السوري: لقطات من داخل المطعم تبرز الشيف والطبق الرئيسي والهوية الحمراء، بمونتاج سريع مناسب للسوشيال ميديا.",
    "alt": "الزين — مطعم سوري — تصوير ومونتاج",
    "imageSmall": "assets/projects/elzain-restaurant-video-900.jpg"
  },
  {
    "id": "f18",
    "code": "F19",
    "title": "المقصود للمولدات — إعلان الشركة",
    "cat": "motion",
    "tag": "إعلان شركة",
    "isVideo": true,
    "video": "assets/projects/f18_elmaqsoud-generators.mp4",
    "url": "",
    "external": false,
    "image": "assets/projects/elmaqsoud-generators-ad.jpg",
    "width": 1200,
    "height": 900,
    "summary": "إعلان شركة المقصود لتوريد المولدات: عرض للمعدات ولوحات التحكم في تكوين ثلاثي الأبعاد يعرّف بالخدمة ويختم برابط الموقع.",
    "alt": "المقصود للمولدات — إعلان الشركة — إعلان شركة",
    "imageSmall": "assets/projects/elmaqsoud-generators-ad-900.jpg"
  },
  {
    "id": "f19",
    "code": "F20",
    "title": "بديل — إعلان سيارة",
    "cat": "motion",
    "tag": "إعلان سيارات",
    "isVideo": true,
    "video": "assets/projects/f19_bdeel-car.mp4",
    "url": "",
    "external": false,
    "image": "assets/projects/bdeel-car-ad.jpg",
    "width": 1200,
    "height": 900,
    "summary": "إعلان سيارة لعلامة «بديل» بأسلوب سينمائي: إضاءة درامية، حركة كاميرا قريبة، وخلفية خطوط ضوئية تمنح المشهد إحساسًا بالسرعة والفخامة.",
    "alt": "بديل — إعلان سيارة — إعلان سيارات",
    "imageSmall": "assets/projects/bdeel-car-ad-900.jpg"
  },
  {
    "id": "f20",
    "code": "F21",
    "title": "الوثبة العقارية — مشروع سكني",
    "cat": "motion",
    "tag": "إعلان عقاري",
    "isVideo": true,
    "video": "assets/projects/f20_alwathba-building.mp4",
    "url": "",
    "external": false,
    "image": "assets/projects/alwathba-real-estate-ad.jpg",
    "width": 1200,
    "height": 900,
    "summary": "إعلان لمشروع سكني لشركة «الوثبة» العقارية: جولة بصرية على واجهات المبنى وتفاصيله، بإطار جرافيكي وخلفية داكنة تُبرز الهوية.",
    "alt": "الوثبة العقارية — مشروع سكني — إعلان عقاري",
    "imageSmall": "assets/projects/alwathba-real-estate-ad-900.jpg"
  },
  {
    "id": "f21",
    "code": "F22",
    "title": "آنس الدمشقي — إعلان الفطيرة",
    "cat": "motion",
    "tag": "إعلان مطعم",
    "isVideo": true,
    "video": "assets/projects/f21_ans-dimashqi-pie.mp4",
    "url": "",
    "external": false,
    "image": "assets/projects/ans-dimashqi-pie-ad.jpg",
    "width": 1200,
    "height": 900,
    "summary": "إعلان طعام ثانٍ لمطعم «آنس الدمشقي»: الفطيرة باللحم والمكونات المتطايرة حولها على خلفية برتقالية، بأسلوب دعائي مباشر ينتهي برقم الطلب.",
    "alt": "آنس الدمشقي — إعلان الفطيرة — إعلان مطعم",
    "imageSmall": "assets/projects/ans-dimashqi-pie-ad-900.jpg"
  },
  {
    "id": "f22",
    "code": "F23",
    "title": "تهنئة العام الهجري 1448 — Almenissy",
    "cat": "digital",
    "tag": "سوشيال ميديا",
    "isVideo": false,
    "url": "",
    "external": false,
    "image": "assets/projects/almenissy-hijri-1448-greeting.jpg",
    "imageSmall": "assets/projects/almenissy-hijri-1448-greeting-900.jpg",
    "width": 1200,
    "height": 1204,
    "summary": "تصميم تهنئة بمناسبة العام الهجري الجديد 1448 لعلامة Almenissy Ideas & Solutions: الخط العربي يملأ المساحة العلوية، وتحته الرقم 1448 كعنصر بصري، مع قافلة جمال في صحراء تحت سماء نجوم.",
    "alt": "تهنئة العام الهجري 1448 — Almenissy — سوشيال ميديا"
  },
  {
    "id": "f23",
    "code": "F24",
    "title": "تهنئة العام الهجري 1448 — GRM Developments",
    "cat": "digital",
    "tag": "سوشيال ميديا",
    "isVideo": false,
    "url": "",
    "external": false,
    "image": "assets/projects/grm-hijri-1448-greeting.jpg",
    "imageSmall": "assets/projects/grm-hijri-1448-greeting-900.jpg",
    "width": 1400,
    "height": 1842,
    "summary": "تصميم تهنئة بالعام الهجري الجديد 1448 لشركة GRM Developments: هلال في سماء ليلية، وقوس أزرق يحتضن الخط العربي والرقم، وقافلة على الجمال تكمل المشهد في المقدمة.",
    "alt": "تهنئة العام الهجري 1448 — GRM Developments — سوشيال ميديا"
  }
];
