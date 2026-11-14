# 🎨 بورتفوليو أحمد مقبل — Ahmed Mokbel

موقع شخصي احترافي لمصمم الجرافيك والموشن جرافيك **أحمد مقبل**، مؤسس وكالة **DOT Media**.
مبني بـ HTML / CSS / JavaScript خام (بدون أي إطار عمل) بدعم كامل للعربية واتجاه RTL،
وتصميم متجاوب مع جميع الشاشات، وتحسينات SEO وأداء وإتاحة.

- **البريد:** ahmed01068775125@gmail.com
- **واتساب:** +20 122 808 4197
- **بيهانس:** https://www.behance.net/ahmed01068b62e
- **فيسبوك:** https://www.facebook.com/profile.php?id=61581319508233
- **إكس:** https://x.com/ahmed0106877

---

## 📁 هيكل المشروع

```text
ahmed-mokbel-portfolio/
│
├── index.html              # الصفحة الرئيسية (مولّدة من content/site.json)
├── motion-graphics.html    # صفحة خدمة الموشن جرافيك (مولّدة من content/pages.json)
├── brand-identity.html     # صفحة خدمة الهوية البصرية (مولّدة من content/pages.json)
├── 404.html                # صفحة الخطأ المخصصة (GitHub Pages يقدّمها تلقائيًا)
├── standalone.html         # نسخة ملف واحد مولّدة آليًا — لا تعدّلها يدويًا
├── build.py                # مولّد الموقع من ملفات content/
│
├── content/
│   ├── site.json           # كل نصوص الصفحة الرئيسية + التواصل + الخدمات + الأسئلة
│   ├── projects.json       # المشاريع (بديل WORK_DATA)
│   └── pages.json          # نصوص صفحتي الخدمات
│
├── admin/
│   ├── index.html          # لوحة التحكم (noindex وغير مربوطة من الموقع)
│   ├── admin.css
│   └── admin.js            # GitHub API + قص وضغط الصور في المتصفح
│
├── .github/workflows/
│   └── deploy.yml          # بناء ونشر تلقائي على GitHub Pages
│
├── css/
│   └── style.css           # نظام التصميم الكامل + التجاوب + تقليل الحركة
├── js/
│   ├── data.js             # مولّد آليًا من content/ — لا تعدّله يدويًا
│   └── main.js             # التفاعلات: القائمة، الفلترة، النوافذ، النموذج...
│
├── assets/
│   ├── projects/           # أغلفة المشاريع وأسماء وصفية (23 مشروعًا)
│   ├── ahmed-mokbel.jpg    # الصورة الشخصية (887px)
│   ├── ahmed-mokbel-480.jpg
│   ├── ahmed-mokbel-800.jpg
│   ├── og-image.jpg        # صورة المشاركة 1200×630
│   ├── apple-touch-icon.png
│   └── favicon.svg
│
├── robots.txt              # توجيهات محركات البحث
├── sitemap.xml             # خريطة الموقع
├── llms.txt                # ملخص الموقع لمحركات الذكاء الاصطناعي
├── a7f3c9d24b6e8f105c3d7a9b2e4f6081.txt  # مفتاح IndexNow (Bing/Yandex)
├── site.webmanifest        # بيانات PWA / أيقونات التثبيت
├── netlify.toml            # رؤوس الأمان والتخزين المؤقت + إعدادات النشر
└── README.md
```

> ملف `صورة احمد.png` في جذر المشروع هو الصورة الأصلية عالية الدقة التي اشتُقت منها
> نسخ `assets/ahmed-mokbel*.jpg`. الموقع لا يستخدمه مباشرة، ويمكن الاحتفاظ به كأصل
> مصدري أو نقله خارج مجلد النشر.

---

## 🚀 التشغيل محليًا

### 1) فتح مباشر (الأسهل)

افتح `index.html` في المتصفح، أو افتح `standalone.html` للحصول على كل شيء داخل ملف واحد.
النموذج يجهّز الرسالة في واتساب افتراضيًا، أو في تطبيق البريد عند اختيار «أرسل عبر البريد».

### 2) خادم محلي (موصى به)

```bash
python -m http.server 8000
```

ثم افتح: `http://localhost:8000`

> استخدم خادمًا محليًا لاختبار الروابط النسبية و`site.webmanifest` بدقة.
> على `localhost` يتحوّل إرسال النموذج تلقائيًا إلى واتساب بدل Netlify.

---

## ✏️ تخصيص المحتوى

المصدر الوحيد للمحتوى هو ملفات **`content/`**، و`build.py` يولّد منها كل صفحات الموقع.
تقدر تعدّل من **لوحة التحكم** (الأسهل) أو من الملفات مباشرة، والنتيجة واحدة.

```text
content/site.json      ← نصوص الرئيسية، التواصل، الخدمات، خطوات العمل، الأسئلة، الإحصائيات
content/projects.json  ← المشاريع
content/pages.json     ← صفحتا الخدمات
        │
        ▼  python build.py
js/data.js · index.html · motion-graphics.html · brand-identity.html · sitemap.xml · standalone.html
```

> **مهم:** لا تعدّل `js/data.js` أو `index.html` يدويًا — أي تعديل يدوي سيُستبدل في
> أول بناء. عدّل `content/*.json` ثم شغّل `python build.py`.

### لوحة التحكم (بدون سيرفر وبدون تكلفة)

اللوحة على: `https://ahmedmokbel99.github.io/admin/` — غير مربوطة من الموقع
و`noindex` وممنوعة في `robots.txt`.

1. أنشئ **Fine-grained token** من GitHub:
   [Settings → Fine-grained tokens](https://github.com/settings/personal-access-tokens/new)
   بصلاحية **Contents: Read and write** على مستودع الموقع فقط (ومدة صلاحية تحددها).
2. الصق التوكن في شاشة الدخول — يُخزَّن في `localStorage` على جهازك فقط.
3. عدّل المشاريع أو النصوص، ثم اضغط **حفظ ونشر**.
4. اللوحة ترفع الملفات عبر GitHub API، وGitHub Actions يبني الموقع وينشره تلقائيًا
   خلال دقائق.

ما تدعمه اللوحة:

- **المشاريع:** إضافة/تعديل/حذف/ترتيب، إظهار أو إخفاء، رفع صورة (قص وضغط تلقائي
  حتى 1600px + نسخة 900px للبطاقة)، ورفض أي صورة أكبر من 3MB، مع **Alt إجباري**.
- **الفيديو:** رفع مقطع MP4 حتى 8MB، أو رابط يوتيوب (غير مدرج) — يُعرض داخل الصفحة
  عبر `youtube-nocookie.com`، أو رابط يوتيوب يُفتح في تاب جديد لو المتصفح قديم.
- **نصوص الموقع:** 84 نصًا في الرئيسية (هيرو، نبذة، خدمات، أرقام، خطوات، أسئلة، نموذج،
  تذييل) + المهارات والأدوات والتصنيفات.
- **صفحات الخدمات:** كل نصوص صفحتي الموشن جرافيك والهوية البصرية.
- **الإعدادات:** حالة النشر، إعادة تحميل المحتوى، تسجيل الخروج.

حدود اللوحة: التغيير يظهر بعد دقائق (بناء + نشر)، والتوكن يُدخل مرة على كل جهاز.

### بيانات التواصل والمعلومات العامة

```json
{
  "brand": { "name": "أحمد مقبل", "jobTitle": "مصمم جرافيك وموشن جرافيك", "location": "المنصورة، مصر",
             "careerStart": 2013, "behanceSince": "2015" },
  "contact": {
    "email": "ahmed01068775125@gmail.com",
    "whatsapp": "201228084197",
    "behance": "https://www.behance.net/ahmed01068b62e",
    "facebook": "https://www.facebook.com/profile.php?id=61581319508233",
    "twitter": "https://x.com/ahmed0106877"
  }
}
```

### الإحصائيات والأرقام

كل الأرقام مربوطة ببعضها من مصدر واحد:

- **سنوات الخبرة** = السنة الحالية − `careerStart` (تتحدّث تلقائيًا كل عام).
- **المشاريع المختارة** (`key: "selected"`) = إجمالي عدد المشاريع في `content/projects.json` — يزيد تلقائيًا مع كل مشروع جديد.
- **عدد المشاريع على بيهانس** (`key: "behance"`) = عدد المشاريع التي لها `external: true` ورابط فعلي (متاح لو رجعت للاستخدام).
- **إجمالي المشاريع وعدد العملاء** قيم ثابتة تُعدَّل يدويًا في `stats`.
- سنة الحقوق في الفوتر تُحدَّث تلقائيًا من تاريخ الجهاز.
- البطاقات العائمة في الهيرو وملاحظة قسم الأعمال تقرأ نفس القيم، فلا تتعارض أبدًا.

### صفحات الخدمات (SEO)

- `motion-graphics.html` و`brand-identity.html` يولّدهما `build.py` من `content/pages.json`، فلا تعدّلهما يدويًا. لكل صفحة:
  عنوان ووصف و`canonical` مستقل، و`H1` بكلمة الخدمة، وبيانات منظمة `Service` + `BreadcrumbList` + `FAQPage`.
- صفحة خدمة جديدة = عنصر جديد في `content/pages.json` بنفس الحقول، وسيُبنى ملف HTML بالاسم المحدد في `slug`.
  بعدها أضِف الرابط في `sitemap.xml` واربطه من بطاقة الخدمة داخل `content/site.json`.

### خصوصية البريد وأسماء الصور

- البريد الإلكتروني غير مكتوب كنص في HTML؛ `main.js` يبنيه من `SITE_DATA.email` وقت التشغيل، مع بديل `noscript`.
  يبقى البريد موجودًا في JSON-LD لأن البيانات المنظمة تحتاجه.
- أسماء صور المشاريع وصفية بالإنجليزية (مثال: `saudi-founding-day-motion-graphic.jpg`).
  استخدم نفس النمط عند إضافة مشروع جديد، وحافظ على نسخة `-900` للبطاقات.
- نموذج التواصل لا يعتمد على خادم: يجهّز الرسالة في واتساب أو البريد الإلكتروني، فيعمل على GitHub Pages بدون أي خدمة مدفوعة.

### الفهرسة السريعة (IndexNow)

- ملف المفتاح `a7f3c9d24b6e8f105c3d7a9b2e4f6081.txt` في جذر الموقع يثبت ملكية النطاق لمحركات Bing وYandex.
- بعد نشر صفحة جديدة، أرسلها فورًا:

```powershell
$body = @{
  host = "ahmedmokbel99.github.io"
  key = "a7f3c9d24b6e8f105c3d7a9b2e4f6081"
  keyLocation = "https://ahmedmokbel99.github.io/a7f3c9d24b6e8f105c3d7a9b2e4f6081.txt"
  urlList = @("https://ahmedmokbel99.github.io/")
} | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.indexnow.org/indexnow" -Method Post -ContentType "application/json" -Body $body
```

- `llms.txt` يقدّم ملخصًا للموقع وروابطه لمحركات الذكاء الاصطناعي، بدون أي تكلفة.
- Google لا يدعم IndexNow؛ الفهرسة عنده تتم عبر `sitemap.xml` في Search Console.
- خطوات تفعيل Search Console وGoogle Business Profile بالتفصيل في [`docs/seo-setup.md`](docs/seo-setup.md).

### إضافة / تعديل مشروع

عدّل `content/projects.json` (أو من اللوحة) بهذا الشكل:

```json
{
  "id": "f14",
  "code": "F14",
  "title": "اسم المشروع",
  "cat": "brand",
  "tag": "هوية وطباعة",
  "isVideo": false,
  "url": "https://www.behance.net/...",
  "external": true,
  "image": "assets/projects/beginnings-motion-graphic.jpg",
  "imageSmall": "assets/projects/beginnings-motion-graphic-900.jpg",
  "width": 1400,
  "height": 1000,
  "alt": "وصف الصورة لمحركات البحث",
  "summary": "وصف مختصر يظهر في نافذة تفاصيل المشروع.",
  "visible": true
}
```

- `visible: false` يخفي المشروع من الموقع بدون حذفه.
- `alt` مطلوب (اللوحة تفرضه) — يُستخدم في البطاقة ونافذة التفاصيل.
- عدّادات الفلاتر وقائمة «الكل» تُحسب تلقائيًا من نفس الملف.
- التصنيفات معرّفة في `categories` داخل `content/site.json`.
- الصور تُحمَّل كسولًا (lazy) داخل البطاقات.

### فيديو المشروع

مقطع داخل المستودع (حتى 8MB من اللوحة):

```json
{ "isVideo": true, "video": "assets/projects/f14.mp4" }
```

أو يوتيوب غير مدرج (أي صيغة رابط: `youtu.be/ID` أو `watch?v=ID` أو `shorts/ID`):

```json
{ "isVideo": true, "youtube": "https://youtu.be/XXXXXXXXXXX" }
```

- يوتيوب يُعرض داخل نافذة المشروع عبر `youtube-nocookie.com` بدون أي إضافات.
- ملفات الفيديو الكبيرة ارفعها على يوتيوب؛ حدّ GitHub هو 100MB للملف لكن الأفضل 8MB.

#### مشروع بأكثر من فيديو (قائمة تشغيل)

بدل `video`، استخدم `videos` لعرض عدة مقاطع داخل نفس المشروع، مع شريط مصغّرات أسفل الوصف:

```js
{
  id: "f03",
  videos: [
    { src: "assets/projects/f16_clip.mp4", poster: "assets/projects/en-serv-logo-animation.jpg", title: "اسم المقطع الأول" },
    { src: "assets/projects/f17_clip.mp4", poster: "assets/projects/elzain-restaurant-video.jpg", title: "اسم المقطع الثاني" }
  ],
  // باقي الحقول كالمعتاد
}
```

- المشروع صاحب `videos` لا يحتاج `video` ولا `url`.
- عدد المقاطع يظهر تلقائيًا في شريط المصغّرات، والضغط على أي مصغّر يشغّل المقطع المقابل.
- حدّ حجم الفيديو في GitHub هو 100MB للملف الواحد؛ الأفضل ضغطه إلى أقل من 10MB.

### الألوان والخطوط

كل متغيرات التصميم في بداية `css/style.css` داخل `:root`
(`--brand`, `--cyan`, `--bg`, `--text`, `--font-ar`, `--font-mono` ...).

---

## 🧱 البناء

```bash
python build.py
```

يقوم السكربت بـ:

1. قراءة `content/site.json` و`content/projects.json` و`content/pages.json` والتحقق منها.
2. توليد `js/data.js` (`SITE_DATA` + `CATEGORIES` + `WORK_DATA`) — لا تعدّله يدويًا.
3. وضع كل النصوص في `index.html` عبر مفاتيح `data-cms`، وتوليد بطاقات الخدمات وخطوات
   العمل والأسئلة وقنوات التواصل وخيارات النموذج.
4. توليد بطاقات المشاريع الثابتة بين `<!-- static-projects:start -->` و`<!-- static-projects:end -->`
   (محتوى يظهر لمحركات البحث بدون JavaScript) + تحديث عدّادات المشاريع.
5. تحديث `title` و`description` وOpen Graph وTwitter وJSON-LD من `site.json`.
6. توليد `motion-graphics.html` و`brand-identity.html` من `pages.json`.
7. تحديث `lastmod` في `sitemap.xml`.
8. بناء `standalone.html` (CSS وJS مدموجان داخل ملف واحد + `noindex`).

> `build.py` يفشل برسالة واضحة لو نقص مفتاح نص أو حقل مشروع — لا يبني نسخة ناقصة.

> أي تعديل على `projectMarkup()` في `js/main.js` يجب أن يُطابَق في `project_card()` داخل `build.py`.

---

## 🌐 النشر

### GitHub Pages + GitHub Actions (الاستضافة الحالية — مجانية ودائمة)

الموقع منشور على: **https://ahmedmokbel99.github.io/**

- الريبو: `AhmedMokbel99/AhmedMokbel99.github.io`
- النشر عبر `.github/workflows/deploy.yml`: كل `push` إلى `main` يشغّل `build.py`
  ثم يرفع الناتج إلى Pages (Settings → Pages → Source = **GitHub Actions**).
- استخدمنا Actions بدل النشر من الفرع لأن اللوحة تعدّل `content/*.json` فقط،
  والبناء يحوّلها إلى HTML ثابت قبل النشر.
- لا توجد مدة تجريبية ولا حدّ زمني؛ GitHub Pages مجاني للمستودعات العامة.

```bash
git add -A
git commit -m "وصف التعديل"
git push
```

> **مهم:** نموذج التواصل لا يحتاج خادمًا ولا خدمة خارجية: يجهّز الرسالة ويفتحها في
> واتساب، أو في تطبيق البريد عند اختيار «أرسل عبر البريد».

### Netlify (بديل اختياري)

1. اسحب مجلد المشروع إلى [Netlify Drop](https://app.netlify.com/drop) أو اربطه بمستودع Git.
2. ملف `netlify.toml` يضبط مجلد النشر والرؤوس الأمنية والتخزين المؤقت تلقائيًا.
3. اذهب إلى **Forms** في لوحة Netlify للتأكد من اكتشاف نموذج `contact`.

### عند استخدام نطاق مخصص

ابحث في المشروع عن `ahmedmokbel99.github.io` وحدّثه في:

- `index.html` (canonical / OG / Twitter / JSON-LD)
- `robots.txt` (رابط sitemap)
- `sitemap.xml`

---

## ✅ ما تم تحسينه

- **تصميم:** نظام ألوان داكن فاخر، تدرجات بنفسجية/سماوية، تسلسل بصري واضح،
  قسم «طريقة العمل» و«الأسئلة الشائعة»، ونافذة تفاصيل مشروع بصور كبيرة وتنقّل.
- **RTL:** ضبط الخطوط العربية (Tajawal + IBM Plex Sans Arabic) دون تباعد حروف سالب،
  وارتفاعات أسطر مناسبة للنص العربي.
- **التجاوب:** نقاط توقف 1080 / 900 / 680 / 420، قائمة جوال كاملة الشاشة،
  وأزرار وحقول بمساحات لمس مريحة.
- **الأداء:** صور محسّنة وأحجام متعددة (`srcset`)، تحميل كسول، CSS/JS بدون مكتبات،
  ونسخ مصغّرة لأغلفة المشاريع.
- **الإتاحة:** رابط تجاوز، HTML دلالي، تسميات ARIA، حصر التركيز داخل القائمة،
  إغلاق النوافذ بـ Escape، احترام `prefers-reduced-motion`.
- **SEO:** عنوان ووصف، Open Graph وTwitter، بيانات منظّمة JSON-LD، sitemap، robots،
  وصفحة 404 مخصصة.
- **الأمان:** رؤوس CSP و`nosniff` و`Referrer-Policy` و`Permissions-Policy`.
- **النموذج:** تحقق فوري من الحقول، رسائل خطأ مرتبطة بالحقول، وإرسال عبر واتساب أو
  البريد الإلكتروني — يعمل على أي استضافة ثابتة بدون خادم.

---

## 🧪 اختبار سريع قبل النشر

- [ ] افتح الموقع على عرض 390px و768px و1440px.
- [ ] جرّب القائمة، الفلاتر، نافذة المشروع (Esc / النقر خارجها / الأسهم).
- [ ] أرسل النموذج فارغًا وتأكد من ظهور رسائل التحقق.
- [ ] تحقق من الروابط الخارجية (بيهانس، فيسبوك، إكس، واتساب).
- [ ] شغّل `python build.py` وتأكد من تحديث `standalone.html`.

---

© أحمد مقبل — DOT Media. جميع الحقوق محفوظة.
