/* ------------------------------------------------------------
   WebMCP — يعرّض أدوات الموقع لوكلاء المتصفح.
   الـAPI موجود بس في المتصفحات اللي بتدعمه؛ في أي متصفح تاني
   الملف بيتحمّل وبيقف بهدوء من غير أي خطأ.
   المرجع: https://webmachinelearning.github.io/webmcp/
------------------------------------------------------------ */
(function () {
  'use strict';

  var context = null;
  try {
    context = document.modelContext || navigator.modelContext || null;
  } catch (error) {
    return;
  }
  if (!context || typeof context.registerTool !== 'function') return;
  if (typeof SITE_DATA === 'undefined' || typeof WORK_DATA === 'undefined') return;

  var controller = typeof AbortController === 'function' ? new AbortController() : null;
  var projects = Array.isArray(WORK_DATA) ? WORK_DATA.slice() : [];
  var MAX_RESULTS = 8;

  var siteEmail = function () {
    var value = SITE_DATA.email || '';
    if (!value) return '';
    if (SITE_DATA.emailEncoding === 'base64') {
      try {
        return atob(value);
      } catch (error) {
        return value;
      }
    }
    return value;
  };

  var text = function (value) {
    return String(value == null ? '' : value).toLowerCase();
  };

  /* تطبيع عربي بسيط: تشكيل + تطويل + أ == ى == ي */
  var normalize = function (value) {
    return text(value)
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ')
      .trim();
  };

  var reply = function (body) {
    return { content: [{ type: 'text', text: body }] };
  };

  var fail = function (message) {
    return { content: [{ type: 'text', text: message }], isError: true };
  };

  var projectLine = function (project) {
    return (
      '- ' +
      project.title +
      ' [' +
      (project.slug || project.id) +
      '] — ' +
      (project.tag || project.cat || '') +
      '\n  ' +
      (project.summary || '')
    );
  };

  var findProject = function (slug) {
    var wanted = text(slug).trim();
    if (!wanted) return null;
    for (var i = 0; i < projects.length; i += 1) {
      var project = projects[i];
      if (text(project.slug) === wanted || text(project.id) === wanted) return project;
    }
    return null;
  };

  var tools = [
    {
      name: 'search_projects',
      description:
        'Search Ahmed Mokbel portfolio projects by keyword or discipline. Returns matching project titles, public slugs, short summaries and the API URL of each project.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Keyword in Arabic or English, for example: موشن جرافيك, هوية, ULTRA GROW.',
          },
          category: {
            type: 'string',
            enum: ['motion', 'ads', 'brand', 'digital'],
            description: 'Optional discipline filter.',
          },
        },
        required: [],
        additionalProperties: false,
      },
      execute: function (args) {
        var query = normalize(args && args.query ? args.query : '');
        var category = text(args && args.category ? args.category : '').trim();

        var matches = projects.filter(function (project) {
          if (category && project.cat !== category) return false;
          if (!query) return true;
          var haystack = normalize(
            [project.title, project.summary, project.tag, project.tools, project.challenge]
              .filter(Boolean)
              .join(' ')
          );
          return haystack.indexOf(query) !== -1;
        });

        if (!matches.length) {
          return reply('لا توجد مشاريع مطابقة لـ«' + (args && args.query ? args.query : '') + '».');
        }

        var body = matches
          .slice(0, MAX_RESULTS)
          .map(projectLine)
          .join('\n');

        return reply(
          'نتائج البحث (' +
            Math.min(matches.length, MAX_RESULTS) +
            ' من ' +
            matches.length +
            '):\n' +
            body
        );
      },
    },

    {
      name: 'get_project',
      description:
        'Return the full case study of one portfolio project: summary, challenge, role, result, tools and gallery links.',
      inputSchema: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'Public project slug from search_projects, for example saudi-founding-day-motion-graphic.',
          },
        },
        required: ['slug'],
        additionalProperties: false,
      },
      execute: function (args) {
        var project = findProject(args && args.slug);
        if (!project) {
          return fail('لا يوجد مشروع بالمعرّف «' + (args && args.slug ? args.slug : '') + '».');
        }

        var lines = [project.title, project.tag || '', '', project.summary || ''];
        if (project.challenge) lines.push('', 'التحدي: ' + project.challenge);
        if (project.role) lines.push('', 'دوري في المشروع: ' + project.role);
        if (project.result) lines.push('', 'النتيجة: ' + project.result);
        if (project.tools) lines.push('', 'الأدوات: ' + project.tools);

        var detail = project.slug ? '/api/projects/' + project.slug + '.json' : '';
        if (detail) lines.push('', 'البيانات الكاملة: ' + detail);
        if (project.external && project.url) lines.push('المشروع الأصلي: ' + project.url);

        return reply(lines.filter(function (line) { return line !== null; }).join('\n'));
      },
    },

    {
      name: 'list_services',
      description:
        'List the services Ahmed Mokbel offers, with a short description and the page URL of each service.',
      inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false },
      execute: function () {
        var services = Array.isArray(SITE_DATA.services) ? SITE_DATA.services : [];
        if (!services.length) return fail('لا توجد خدمات منشورة.');
        return reply(
          services
            .map(function (service) {
              return (
                '- ' +
                service.title +
                ': ' +
                service.desc +
                (service.link ? '\n  ' + service.link : '')
              );
            })
            .join('\n')
        );
      },
    },

    {
      name: 'get_profile',
      description:
        'Return Ahmed Mokbel public profile: role, location, studio, disciplines, tools and public contact channels.',
      inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false },
      execute: function () {
        var stats = (SITE_DATA.stats || []).map(function (stat) {
          return stat.label;
        });
        var lines = [
          SITE_DATA.name,
          SITE_DATA.title,
          '',
          SITE_DATA.lead,
          '',
          'الموقع: ' + SITE_DATA.location + '، مصر (يعمل عن بُعد).',
          'الاستوديو: ' + SITE_DATA.agency.name + ' — ' + SITE_DATA.agency.description,
          'التخصصات: ' + (SITE_DATA.skills || []).join('، '),
          'الأدوات: ' + (SITE_DATA.tools || []).join('، '),
          stats.length ? 'الأرقام: ' + stats.join('، ') : '',
          '',
          'واتساب: https://wa.me/' + SITE_DATA.whatsapp,
          'البريد: ' + siteEmail(),
          'Behance: ' + SITE_DATA.behance,
          'المشاريع: /api/projects.json',
          'سياسة الخصوصية: /privacy.html',
          'كتالوج API: /.well-known/api-catalog',
          'كتالوج الوكلاء: /.well-known/ai-catalog.json',
          'توثيق API: /docs/api/',
        ];
        return reply(
          lines.filter(function (line) { return line !== ''; }).join('\n')
        );
      },
    },

    {
      name: 'start_project_inquiry',
      description:
        'Fill the contact form with a project inquiry and bring it into view for the human to review. It never sends anything: the visitor must press the send button themselves.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Visitor name, 2 to 80 characters.' },
          phone: { type: 'string', description: 'Phone or WhatsApp number, 7 to 20 characters.' },
          service: {
            type: 'string',
            description: 'Requested service, for example: موشن جرافيك.',
          },
          message: { type: 'string', description: 'Project details, 10 to 2000 characters.' },
          email: { type: 'string', description: 'Optional email address.' },
        },
        required: ['name', 'phone', 'service', 'message'],
        additionalProperties: false,
      },
      execute: function (args) {
        var input = args || {};
        var errors = [];
        var name = String(input.name == null ? '' : input.name).trim();
        var phone = String(input.phone == null ? '' : input.phone).trim();
        var service = String(input.service == null ? '' : input.service).trim();
        var message = String(input.message == null ? '' : input.message).trim();
        var email = String(input.email == null ? '' : input.email).trim();

        if (name.length < 2 || name.length > 80) errors.push('name: 2–80 حرفًا.');
        if (!/^[0-9+\s()\-]{7,20}$/.test(phone)) errors.push('phone: رقم غير صالح.');
        if (!service) errors.push('service: مطلوب.');
        if (message.length < 10 || message.length > 2000) errors.push('message: 10–2000 حرفًا.');
        if (email && !/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(email)) errors.push('email: غير صالح.');

        if (errors.length) return fail('بيانات غير مكتملة:\n- ' + errors.join('\n- '));

        var form = document.getElementById('contactForm');
        if (!form) return fail('نموذج التواصل غير متاح في هذه الصفحة.');

        var setField = function (id, value) {
          var field = document.getElementById(id);
          if (!field || !value) return;
          field.value = value;
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        };

        setField('fieldName', name);
        setField('fieldPhone', phone);
        setField('fieldMessage', message);
        setField('fieldEmail', email);

        var select = document.getElementById('fieldService');
        if (select) {
          var matched = false;
          for (var i = 0; i < select.options.length; i += 1) {
            if (select.options[i].value === service) {
              select.selectedIndex = i;
              matched = true;
              break;
            }
          }
          if (matched) {
            select.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            return reply(
              'تم تعبئة بقية الحقول، لكن الخدمة «' +
                service +
                '» غير موجودة في القائمة. يرجى اختيار خدمة من القائمة قبل الإرسال.'
            );
          }
        }

        var section = document.getElementById('contact');
        if (section && typeof section.scrollIntoView === 'function') {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        return reply(
          'تم تعبئة النموذج ولم يُرسل. راجع البيانات مع الزائر، وبعد موافقته اضغط ' +
            '«أرسل الطلب» بنفسك. الإرسال لا يحدث تلقائيًا أبدًا.'
        );
      },
    },
  ];

  var register = function (tool) {
    try {
      var result = controller
        ? context.registerTool(tool, { signal: controller.signal })
        : context.registerTool(tool);
      if (result && typeof result.catch === 'function') {
        result.catch(function () {
          /* المتصفح رفض الأداة — نتجاهل بهدوء */
        });
      }
    } catch (error) {
      try {
        var retry = context.registerTool(tool);
        if (retry && typeof retry.catch === 'function') retry.catch(function () {});
      } catch (ignored) {
        /* API غير مكتمل — لا نكسر الصفحة */
      }
    }
  };

  tools.forEach(register);

  if (controller) {
    window.addEventListener(
      'pagehide',
      function () {
        try {
          controller.abort();
        } catch (error) {
          /* لا شيء */
        }
      },
      { once: true }
    );
  }
})();
