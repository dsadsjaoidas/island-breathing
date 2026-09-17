// الفصل الثالث — مقبرة السفن، القلب، والهروب
const qDone = (s, id) => { const q = s.quests && s.quests.list.find(x => x.id === id); return !!q && q.n >= q.need; };
const BOAT_KEY = 'beach@14,16';

label('a3_ribs', [
  { progress: 'deeper' },
  { quests: { title: 'الفصل الثالث: مقبرة السفن', list: [['planks', 'اجمع الألواح السليمة', 3, 'yunus'], ['sail', 'اعثر على قماش القلع', 1, 'sas'], ['rudder', 'أحضر الدفة مع فحمة'], ['crack', 'افتح الشق مع همس'], ['heart', 'واجه قلب الجزيرة'], ['escape', 'اهرب نحو الضوء']] } },
  { explore: 'ribs' },
]);

label('r_crow', [
  N('الدفة عالقة فوق ضلع عالٍ، لا يصل إليه أحد يمشي على قدمين.'),
  Fh('فحمة تطير. فحمة تستطيع.'),
  { choice: [
    opt('«أحضريها يا فحمة.»', 'r_cr_ask'),
    opt('أتسلق الضلع بنفسي', 'r_cr_climb'),
    opt('ساس تطلب من فحمة', 'r_cr_sas', { when: s => s.stats.bond >= 3 }),
  ] },
]);
label('r_cr_ask', [
  { when: s => (s.flags.fahmaTrust || 0) < 2, goto: 'r_cr_refuse' },
  { sfx: 'crow' },
  { cg: 'crow_rudder', text: 'طارت فحمة إلى أعلى الضلع... وعادت بالدفة!' },
  N('طارت فحمة، وعادت تجرّ الدفة بمنقارها وجناحيها، وأسقطتها عند قدميك.'),
  go('r_cr_got'),
]);
label('r_cr_refuse', [
  Fh('أنت جرحت الجذور. الجزيرة غاضبة منك... وفحمة خائفة.'),
  go('r_cr_climb'),
]);
label('r_cr_climb', [
  { fx: 'shake', sfx: 'hurt' },
  N('تسلقت الضلع الزلق. انزلقت مرتين، وفي الثالثة أمسكت الدفة... وسقطتما معًا.'),
  { stat: { hull: -1 } },
  Sa('عنيد. عنيد كالصخر.'),
  go('r_cr_got'),
]);
label('r_cr_sas', [
  Sa('فحمة، أرجوكِ. لأجل الأغنية.'),
  Fh('لأجل الأغنية.'),
  { sfx: 'crow' },
  { set: { fahmaTrust: 3 } },
  go('r_cr_got'),
]);
label('r_cr_got', [{ set: { rudderGot: true }, progress: 'rudder' }, resume]);

label('r_crack', [
  N('جدار من العظم، وفي وسطه شق ضيق. خلفه صوت ضربات قلب هائل.'),
  Hm('الشق يقود إلى القلب. لا يدخله إلا من لا عظام له.'),
  { when: s => s.flags.hamsTrust === 0, goto: 'r_ck_grudge' },
  go('r_ck_offer'),
]);
label('r_ck_grudge', [
  Hm('لكن من حاول ضربي بالمجداف... ربما يستحق أن يبقى هنا.'),
  { choice: [
    opt('«أعتذر يا همس. كنت خائفًا.»', 'r_ck_offer', { set: { hamsTrust: 1 } }),
    opt('«افتحه، أو لن يخرج أحد منا.»', 'r_ck_threat', { stat: { resolve: 1 } }),
  ] },
]);
label('r_ck_threat', [Hm('...صحيح. لا يخرج أحد إلا معًا. حسنًا.'), go('r_ck_open')]);
label('r_ck_offer', [
  Hm('سأدخل وأزيح العظمة من الداخل. إن لم أعد خلال عشرة أنفاس... اذهبا من دوني.'),
  { choice: [
    opt('«سننتظرك.»', 'r_ck_open', { set: { waitedHams: true } }),
    opt('«خذ فحمة معك.»', 'r_ck_open', { set: { fahmaHelpedHams: true } }),
  ] },
]);
label('r_ck_open', [
  { sfx: 'hiss' },
  { cg: 'hams_crack', text: 'انسلّ همس في الشق الضيق...' },
  N('انسلّ همس في الشق. عشرة أنفاس... تسعة... ثم تحركت العظمة بصوت طويل، وانفتح الممر.'),
  { set: { hamsOpened: true }, progress: 'crack' },
  Hm('الطريق مفتوح. الجذور الحمراء بعده تنفتح مع الزفير فقط.'),
  resume,
]);

label('r_note', [
  N('آخر سجلّ، مربوط بعظمة داخل بركة الحمض الجافة:'),
  N('«القلب لا يُقتل. يُهدَّأ، أو يُخدَع، أو يُطعَم. من يطعنه يوقظ الجزيرة كلها.»'),
  N('«وإن نجوتم... لا تعودوا إلى البحر وأنتم نائمون.» — مرزوق'),
  Sa('«وأنتم نائمون»؟ ماذا يقصد؟'),
  { set: { readRibs: true } },
  resume,
]);

// ---------- القلب ----------
label('r_heart', [
  { scene: 'heart', music: 'heart', amb: ['heartbeat', 'breath'] },
  N('قاعة من الأضلاع، وفي وسطها قلب بحجم بيت، ينبض فتهتز الجزيرة كلها.'),
  N('والممر إلى الضوء خلفه تمامًا. ومع كل نبضة، يسدّه.'),
  Hm('هنا ينتهي كل من سبقكما.', s => s.flags.metHams),
  go('r_heart_pick'),
]);
label('r_heart_pick', [
  { when: s => Net.connected && !s.flags.sasHeartTurn, goto: 'r_heart_sas' },
  { choice: [
    opt('أطعنه بلوح مشتعل', 'r_h_stab', { set: { heartStabbed: true } }),
    opt('ساس تغني له أغنية أبيها', 'r_h_sing', { when: s => s.stats.bond >= 4 || s.flags.sasWillSing, set: { heartCalmed: true } }),
    opt('نتسلل بين النبضات', 'r_h_sneak', { set: { heartSneaked: true } }),
    opt('همس يلدغه بسمّه لينام', 'r_h_hams', { when: s => s.flags.hamsAlly, set: { hamsSacrifice: true } }),
  ] },
]);
label('r_h_stab', [
  { fx: 'lightning' },
  { fx: 'shake', sfx: 'exhale' },
  { cg: 'heart_stab', text: 'غرس يونس اللوح المشتعل في القلب... وصرخت الجزيرة كلها.' },
  N('غرست اللوح المشتعل في اللحم. صرخ القلب، وتوقف نبضة كاملة... وانفتح الممر.'),
  N('لكن الجزيرة كلها استيقظت. شعرتما بها تنتفض من الشاطئ إلى القمة.'),
  { stat: { resolve: 1, hull: -1 } },
  Sa('يونس... ما الذي فعلته؟'),
  go('r_h_after'),
]);
label('r_h_sing', [
  { cg: 'heart_sing', text: 'تقدّمت ساس نحو القلب العملاق... وبدأت تغني أغنية أبيها.' },
  N('غنّت ساس بصوت مرتجف في البداية، ثم ثابت. أغنية عن بحّار يعود إلى نافذة المنارة.'),
  N('تباطأ القلب. نبضة... ثم صمت طويل... ثم نبضة. وانفتح الممر كجفن ناعس.'),
  { stat: { bond: 1 } },
  Fh('جميلة. الجزيرة نامت.'),
  go('r_h_after'),
]);
label('r_h_sneak', [
  { when: s => !s.flags.knowsRhythm, goto: 'r_h_sneak_bad' },
  { cg: 'heart_sneak', text: 'بين نبضة ونبضة، انزلق يونس وساس على أطراف أصابعهما.' },
  N('عددتما: نبضة، اثنتان، ثلاث... الآن! انزلقتما بين الانقباضتين دون أن يشعر القلب بكما.'),
  { stat: { resolve: 1 } },
  go('r_h_after'),
]);
label('r_h_sneak_bad', [
  { fx: 'shake', sfx: 'hurt' },
  N('أخطأتما الإيقاع. انقبض القلب وضغطكما على الأضلاع قبل أن ينفرج من جديد.'),
  { stat: { hull: -1, resolve: -1 } },
  go('r_h_after'),
]);
label('r_h_hams', [
  Hm('ثلاثون سنة أبحث عن فم هذه الجزيرة... وربما كان مكاني في قلبها.'),
  Sa('همس، لا! الاتفاق كان أن تخرج معنا!'),
  Hm('الاتفاق كان أن تخرجا أنتما. اذهبا مع الزفرة.'),
  { sfx: 'hiss' },
  { cg: 'hams_sacrifice', text: 'انقضّ همس على القلب، وغرس أنيابه فيه.' },
  N('انقضّ همس على القلب وغرس أنيابه. تباطأ النبض حتى صار همسًا... ولم يعد همس.'),
  { stat: { bond: 1, resolve: 1 } },
  go('r_h_after'),
]);
label('r_h_after', [
  { set: { heartDone: true }, progress: 'heart' },
  { explore: 'ribs', at: 'X' },
]);

// ---------- الهروب ----------
label('a3_escape', [
  { when: s => !(qDone(s, 'planks') && qDone(s, 'sail') && qDone(s, 'rudder')), goto: 'a3_escape_missing' },
  { progress: 'escape' },
  N('ممرّ ضيق يصعد نحو ضوء أبيض... ورائحة ملح.'),
  { set: { finalBeach: true }, day: 6 },
  { quests: { title: 'الفصل الثالث: الزفرة الكبرى', list: [['repair', 'أصلح القارب بالأجزاء'], ['launch', 'أبحر مع الزفرة الكبرى']] } },
  { explore: 'beach', at: 'B' },
]);
label('a3_escape_missing', [Sa('لن نخرج بلا ألواح وقماش ودفة. القارب لن يطفو.'), resume]);

label('a3_repair', [
  { when: s => s.flags.repaired, goto: 'a3_launch_ask' },
  { sfx: 'tie' },
  { cg: 'repair_boat', text: 'مطرقة، وألواح، وقلع جديد... القارب يعود للحياة.' },
  N('ثبّتما الألواح الثلاثة، وشدّت ساس القماش على الصاري، وركّبت أنت الدفة.'),
  { wait: 800, sfx: 'tie' },
  { obj: { [BOAT_KEY]: 1 }, set: { repaired: true }, progress: 'repair', stat: { hull: 2 } },
  Sa('ليس جميلًا. لكنه سيطفو.'),
  { when: s => s.flags.metHams && !s.flags.hamsSacrifice, goto: 'a3_hams_choice' },
  go('a3_launch_ask'),
]);
label('a3_hams_choice', [
  N('على الرمل، التفّ همس ينتظر، ولم يقل شيئًا.'),
  { when: () => Net.connected, goto: 'a3_hams_sas' },
  { choice: [
    opt('«اصعد يا همس. الاتفاق اتفاق.»', 'a3_hams_take', { set: { hamsAboard: true } }),
    opt('«آسف يا همس. لا نعرف ما الذي قد تفعله في البحر.»', 'a3_hams_leave', { set: { hamsLeft: true } }),
  ] },
]);
label('a3_hams_take', [Hm('ثلاثون سنة... وأخيرًا سأرى الأفق.'), { stat: { resolve: 1 } }, go('a3_launch_ask')]);
label('a3_hams_leave', [
  Hm('توقعت ذلك. البشر يحفظون الاتفاقات حين تكون مريحة.'),
  { cg: 'hams_farewell', text: 'بقي همس على الشاطئ... يراقب القارب يبتعد.' },
  Sa('يونس...'),
  { stat: { bond: -1 } },
  go('a3_launch_ask'),
]);

label('a3_launch_ask', [
  N('انحسر البحر عن الشاطئ ببطء. الجزيرة تتهيأ لزفرة طويلة.'),
  { choice: [
    opt('نبحر الآن، قبل أن يتغير شيء', 'a3_launch', { set: { launchedEarly: true } }),
    opt('ننتظر ذروة الزفير', 'a3_launch', { set: { launchedOnExhale: true } }),
    opt('ليس بعد', 'a3_not_yet'),
  ] },
]);
label('a3_not_yet', [resume]);

label('a3_launch', [
  { progress: 'launch' },
  { scene: 'escape', music: 'chase', amb: ['storm_wind', 'ocean_rough'] },
  { quests: null },
  { cg: 'launch', text: 'مع الزفرة الكبرى، انطلق القارب نحو البحر المفتوح!' },
  { cg: 'escape', text: 'دفعا القارب إلى الماء... وفتحت الجزيرة فكّيها خلفهما!' },
  N('دفعتما القارب إلى الماء... وفتحت الجزيرة عينها.'),
  { when: s => s.flags.heartStabbed, stat: { hull: -1 } },
  N(s => s.flags.heartStabbed ? 'القلب المطعون يريد انتقامه: ارتفع الشاطئ كفكّ، وأسنان بطول الصواري.' : 'ارتفع الشاطئ خلفكما كفكّ يستيقظ من نومه.'),
  { when: s => s.flags.launchedEarly, goto: 'a3_early' },
  go('a3_run'),
]);
label('a3_early', [
  { fx: 'shake', stat: { hull: -1 } },
  N('أبحرتما مع الشهيق. سحب البحر القارب إلى الوراء، نحو الفم، قبل أن يدفعه من جديد.'),
  go('a3_run'),
]);

label('a3_run', [
  { when: s => s.stats.hull <= 0, goto: 'a3_lost' },
  Sa('الفم يُغلق! يونس!'),
  go('a3_run_pick'),
]);
label('a3_run_pick', [
  { when: s => Net.connected && !s.flags.sasRunTurn, goto: 'a3_run_sas' },
  { choice: [
    opt('أجدّف بكل ما بقي فيّ', 'a3_r_row'),
    opt('أرفع القلع الجديد', 'a3_r_sail'),
    opt('ساس على الدفة، وأنا أنزح الماء', 'a3_r_team'),
    opt('«فحمة! دلّينا على الطريق!»', 'a3_r_fahma'),
  ] },
]);
label('a3_r_row', [
  { when: s => s.stats.resolve >= 4 || s.flags.sasBail, goto: 'a3_r_ok' },
  { fx: 'shake', stat: { hull: -2 } },
  N('جدّفت حتى تمزقت كفّاك. مرّ القارب بين الأسنان، لكن ضرسًا شقّ جانبه.'),
  go('a3_r_end'),
]);
label('a3_r_sail', [
  { when: s => s.flags.launchedOnExhale || s.flags.heartCalmed, goto: 'a3_r_ok' },
  { fx: 'shake', stat: { hull: -1 } },
  N('امتلأ القلع بالزفير وانطلق القارب... لكن الريح انقلبت مع الشهيق، ولطمتكما موجة.'),
  go('a3_r_end'),
]);
label('a3_r_team', [
  { when: s => s.stats.bond >= 4 || s.flags.sasHelm, goto: 'a3_r_ok' },
  { fx: 'shake', stat: { hull: -1 } },
  N('تبادلتما الصراخ أكثر مما تبادلتما الأدوار. نجوتما، بصعوبة.'),
  go('a3_r_end'),
]);
label('a3_r_fahma', [
  { when: s => (s.flags.fahmaTrust || 0) >= 2 || s.flags.sasCalledFahma, goto: 'a3_r_ok' },
  { fx: 'shake', stat: { hull: -1 } },
  N('طارت فحمة، ترددت، ثم عادت. دلّتكما، لكن بعد أن خسرتما ثواني ثمينة.'),
  go('a3_r_end'),
]);
label('a3_r_ok', [
  N('مرّ القارب بين الفكّين كخيط في إبرة. لمس ضرس القلع، ولم يمزقه.'),
  { stat: { resolve: 1 } },
  go('a3_r_end'),
]);

label('a3_r_end', [
  { when: s => s.stats.hull <= 0, goto: 'a3_lost' },
  { when: s => s.flags.hamsAboard, goto: 'a3_tongue' },
  go('a3_free'),
]);
label('a3_tongue', [
  { fx: 'shake' },
  N('امتد لسان أحمر من البحر، والتفّ حول مؤخرة القارب.'),
  Hm('هذه لي.'),
  { choice: [
    opt('أترك همس يقفز', 'a3_t_let', { set: { hamsHero: true } }),
    opt('أمسك همس وأقطع اللسان بالمجداف', 'a3_t_hold', { stat: { hull: -1 } }),
  ] },
]);
label('a3_t_let', [
  { sfx: 'hiss' },
  { cg: 'hams_tongue', text: 'قفز همس من القارب نحو اللسان الأحمر...' },
  N('قفز همس على اللسان وغرس أنيابه. ارتخى اللسان وسقط في الماء... ومعه همس.'),
  Sa('همس!!'),
  N('آخر ما رأيتماه: ذيل زيتوني يلتف كعلامة استفهام، ثم يختفي.'),
  go('a3_free'),
]);
label('a3_t_hold', [
  { when: s => s.stats.hull <= 0, goto: 'a3_lost' },
  N('ضربت اللسان مرة، ومرتين، حتى أفلت. التفّ همس حول الصاري يلهث.'),
  Hm('...شكرًا. لم يفعلها أحد لأجلي من قبل.'),
  go('a3_free'),
]);

label('a3_free', [
  { sfx: 'exhale' },
  N('خلفكما، أطلقت الجزيرة زفرة غاضبة... ثم غاصت ببطء تحت الموج، كحيوان يعود إلى نومه.'),
  Sa('نجونا. يونس... نجونا!'),
  go('act4'),
]);

label('a3_lost', [
  { fx: 'shake', sfx: 'slam' },
  N('انكسر القارب بين الأسنان. آخر ما رأيته يد ساس تمتد نحوك... ثم أُطبق الفم.'),
  { cg: 'lost', text: 'أُطبق الفم.' },
  { scene: 'black', music: null, amb: ['breath'] },
  N('ظلام دافئ. ونَفَس بطيء. يعلو... ويهبط.'),
  { amb: ['hum', 'clock'] },
  V('يونس؟ ...يونس؟'),
  N('لكنك لم تستيقظ. وفي الطابق الرابع، بقي كرسي فارغ أمام شاشة مضيئة.'),
  { amb: [] },
  { ending: 'lost' },
  { end: true },
]);
