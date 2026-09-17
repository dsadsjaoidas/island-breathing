// Tiny script DSL. A label is a list of commands; see README for the command reference.
const Story = {};
const label = (name, cmds) => { Story[name] = cmds; };
const speaker = who => (text, when) => ({ say: who, text, when });
const N = speaker('narrator');
const Y = speaker('yunus');
const Sa = speaker('sas');
const A = speaker('adel');
const M = speaker('marzouq');
const V = speaker('voice');
const Hm = speaker('hams');
const Fh = speaker('fahma');
const Is = speaker('island');
const Mg = speaker('manager');
const Jn = speaker('janitor');
const opt = (text, goto, extra) => ({ text, goto, ...extra });
const go = name => ({ goto: name });
const resume = { resume: true };
