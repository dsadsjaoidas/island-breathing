// اللعب الجماعي: قرارات ساس الخاصة، ونصوص من وجهة نظرها (label@sas تُعرض للاعب ساس فقط).

// ---------- قرارات مشتركة تتخذها ساس وحدها ----------
label('a2_sas_turn', [
  { set: { sasTurnNight: true } },
  Sa('(دورك يا ساس. يونس ينتظر ردك.)'),
  { who: 'sas', choice: [
    opt('«ولا أنا سأتركك. أبدًا.»', 'a2_st_loyal', { stat: { bond: 1 } }),
    opt('أمزح لأخفف الجو', 'a2_st_joke', { stat: { resolve: 1 } }),
    opt('أصمت وأراقب الغابة وأعدّ أنفاس الجزيرة', 'a2_st_watch', { set: { knowsRhythm: true } }),
  ] },
]);
label('a2_st_loyal', [Sa('ولا أنا سأتركك. حتى لو أكلتنا هذه الجزيرة، ستأكلنا معًا.'), go('a2_event')]);
label('a2_st_joke', [Sa('على الأقل لن ندفع إيجار هذه الليلة. الجزيرة كريمة.'), N('ضحك يونس رغمًا عنه.'), go('a2_event')]);
label('a2_st_watch', [N('عدّت ساس بصمت: عشر ثوانٍ بين كل شهيق وشهيق. حفظت الإيقاع.'), go('a2_event')]);

label('c_h_deal_mp', [
  Sa('(يونس ينظر إليكِ. القرار لكِ.)'),
  { who: 'sas', choice: [
    opt('«اتفقنا يا همس. لكن إن غدرت بنا، سأربطك عقدة بحّارة.»', 'c_h_accept', { set: { hamsAlly: true }, stat: { bond: 1 } }),
    opt('«لا نعقد صفقات مع الثعابين.»', 'c_h_refuse'),
  ] },
]);

label('r_heart_sas', [
  { set: { sasHeartTurn: true } },
  Sa('(أغنية أبي... ربما تهدّئه. هل أجرؤ؟)'),
  { who: 'sas', choice: [
    opt('«يونس، دعني أغني له.»', 'r_heart_pick', { set: { sasWillSing: true } }),
    opt('«القرار لك يا يونس. أنا خلفك.»', 'r_heart_pick'),
  ] },
]);

label('a3_hams_sas', [
  Sa('(همس ينظر إليكِ أنتِ، لا إلى يونس.)'),
  { who: 'sas', choice: [
    opt('«اصعد يا همس. وعد البحّار وعد.»', 'a3_hams_take', { set: { hamsAboard: true } }),
    opt('«آسفة يا همس. البحر ليس مكانك.»', 'a3_hams_leave', { set: { hamsLeft: true } }),
  ] },
]);

label('a3_run_sas', [
  { set: { sasRunTurn: true } },
  Sa('(ماذا ستفعلين يا ساس؟)'),
  { who: 'sas', choice: [
    opt('أمسك الدفة بكل قوتي', 'a3_run_pick', { set: { sasHelm: true } }),
    opt('أنزح الماء من القارب', 'a3_run_pick', { set: { sasBail: true } }),
    opt('أنادي فحمة لتدلّنا', 'a3_run_pick', { set: { sasCalledFahma: true } }),
  ] },
]);

// ---------- مهمات ساس الخاصة ----------
label('b_charts', [
  N('خرائط ساس القديمة، مبلولة لكنها سليمة. في زاويتها رسم أبيها: جزيرة بلا اسم، وبجانبها سهم وكلمة «تتنفّس».'),
  { progress: 'charts', set: { readCharts: true } },
  resume,
]);
label('b_charts@sas', [
  N('فردتِ خرائط أبيكِ على الرمل. خطّه الدقيق، وأرقام الأعماق، ورائحة التبغ القديمة.'),
  N('وفي الزاوية... رسم لهذه الجزيرة بالذات. وكلمة واحدة بخطّ مرتجف: «تتنفّس».'),
  Sa('(أبي كان هنا. ورسمها حتى لا ينساها... أو حتى أجدها أنا.)'),
  { who: 'sas', choice: [
    opt('أحتفظ بالخريطة لنفسي الآن', 'b_ch_keep', { set: { sasSecretMap: true } }),
    opt('أنادي يونس لأريه', 'b_ch_share', { stat: { bond: 1 } }),
  ] },
]);
label('b_ch_keep', [{ progress: 'charts', set: { readCharts: true } }, Sa('(ليس الآن. سيقلق عليّ أكثر مما يجب.)'), resume]);
label('b_ch_share', [{ progress: 'charts', set: { readCharts: true } }, Sa('(سأريه عند النار. نحتاج أن نعرف كل شيء معًا.)'), resume]);

label('o_ledger', [
  N('جدول المحاسبة مفتوح على شاشتكِ. أرقام يونس المتأخرة، وأرقامكِ المرتبة.'),
  Sa('(حلمتُ الليلة ببحر وغراب... وبأنني كنت على الدفة.)'),
  { choice: [
    opt('أُنهي الجدول وأغطي تأخر يونس في الأرقام', 'o_l_cover', { stat: { bond: 1 }, set: { sasCovered: true } }),
    opt('أُنهي جدولي فقط', 'o_l_mine'),
    opt('أفتح خريطة المرسى القديم بدل الجدول', 'o_l_sea', { set: { friendsPlan: true } }),
  ] },
]);
label('o_l_cover', [{ sfx: 'type', wait: 800, progress: 'ledger' }, Sa('(مرة أخيرة يا يونس. مرة أخيرة... كما أقول كل شهر.)'), resume]);
label('o_l_mine', [{ sfx: 'type', wait: 800, progress: 'ledger' }, resume]);
label('o_l_sea', [
  { progress: 'ledger' },
  N('بحثتِ عن «قوارب للإيجار – المرسى القديم». قارب صغير، متاح يوم السبت.'),
  Sa('(إن حكى لي يونس عن حلمه... سأحجزه.)'),
  resume,
]);

// ---------- نصوص من وجهة نظر ساس ----------
label('b_shell@sas', [
  N('صدفة منقوشة بسكين. سبعة أسماء، وتاريخ قبل عشرين سنة.'),
  N('الاسم الرابع... اسم أبيكِ. بخطّه نفسه الذي كتب به على باب غرفتكِ.'),
  Sa('(كان هنا. وقف على هذا الشاطئ نفسه، ونقش اسمه، ورجع إليّ.)'),
  { set: { foundShell: true, knowsSasFather: true } },
  resume,
]);
label('b_eye@sas', [
  N('في البركة عين. لا ترمش. وتنظر إليكِ كأنها تتذكّركِ.'),
  Sa('(رأيتُ هذه النظرة من قبل. في عيني أبي، حين كان يعدّ أنفاسه على الشرفة.)'),
  { set: { sawEye: true } },
  resume,
]);
label('j_note3@sas', [
  readNote(3),
  N('«لم يبقَ إلا أنا ومرزوق ورفيقنا الثالث. الغراب ذو الريشة البيضاء دلّنا. اهربوا مع الزفرة الكبرى.»'),
  N('الخط... خطّ أبيكِ. لا شك في ذلك.'),
  { who: 'sas', choice: [
    opt('أطوي الورقة وأضعها قرب قلبي', 'j_n3s_keep', { set: { knowsSasFather: true } }),
    opt('أقرؤها بصوت عالٍ ليسمعها يونس', 'j_n3s_read', { set: { knowsSasFather: true }, stat: { bond: 1 } }),
  ] },
]);
label('j_n3s_keep', [Sa('(سأعيدها إليه حين نعود. سيضحك، ثم سيبكي.)'), resume]);
label('j_n3s_read', [Sa('يونس! أبي كتب هذه! أبي نجا من هنا... ونحن سننجو.'), resume]);
label('c_note2@sas', [
  { progress: 'marks' },
  N('نقش صغير قرب الأرض، محفور على عجل: «ساس. سأعود إليكِ.»'),
  Sa('(كتب اسمي هنا. في هذا الظلام. قبل أن أعرف معنى البحر.)'),
  { who: 'sas', choice: [
    opt('أنقش تحته: «وأنا عدتُ إليك»', 'c_n2s_carve', { stat: { resolve: 1 } }),
    opt('أمسح الغبار عن النقش وأمضي', 'c_n2s_go'),
  ] },
]);
label('c_n2s_carve', [{ sfx: 'tie' }, N('حفرتِ الحروف بسكين أبيكِ. «وأنا عدتُ إليك.»'), { set: { readCave2: true, sasCarved: true } }, resume]);
label('c_n2s_go', [{ set: { readCave2: true } }, resume]);

label('o_crow@sas', [
  N('غراب على النافذة بريشة بيضاء. ينقر الزجاج ثلاث نقرات، وينظر إليكِ أنتِ.'),
  Sa('(فحمة؟ ...لا. أنا متعبة فقط. لكنه يشبهها بشكل غريب.)'),
  { set: { sasSawCrow: true } },
  resume,
]);
label('o_aquarium@sas', [
  N('الجزيرة البلاستيكية في الحوض تعلو وتهبط. وعلى سطحها خيط أخضر صغير كعلامة استفهام.'),
  Sa('(همس؟ ...يا إلهي، أحلام يونس صارت تُعدي.)'),
  resume,
]);
label('o_cable@sas', [
  N('سلك أسود متشابك تحت مكتب يونس. التفّ حول قدمكِ برفق.'),
  Sa('(لا تخف يا يونس... أعني، يا سلك. ما الذي أقوله؟)'),
  resume,
]);
label('o_janitor@sas', [
  Jn('ابنة البحّار. لك عينا أبيكِ.'),
  Sa('العم مرزوق؟ ...هل تعرف أبي؟'),
  Jn('عرفته في رحلة طويلة جدًا. قولي له إن الغراب ما زال يزورني.'),
  { set: { sasTalkedJanitor: true } },
  resume,
]);
label('o_coffee@sas', [
  { progress: 'coffee' },
  N('قهوة مُرّة. طعمها كماء نبع في غابة لم تزوريها قطّ... أو ربما زرتِها.'),
  resume,
]);
