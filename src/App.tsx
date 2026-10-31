import type { SkillId } from './engine/scenarios/types';
import { SKILLS } from './engine/scenarios/types';
import { Home } from './screens/Home';
import { LessonList, LessonView } from './screens/Lessons';
import { Practice } from './screens/Practice';
import { Glossary, Settings } from './screens/Settings';
import { Stats } from './screens/Stats';
import { GlossaryProvider, Icon } from './ui/components';
import { StateProvider, useHashRoute } from './ui/state';

function Shell() {
  const [parts, go] = useHashRoute();
  const [root, arg] = parts;
  let body: React.ReactNode;
  let tabs = true;
  if (root === 'practice' && (arg === 'mix' || SKILLS.some((s) => s.id === arg))) {
    body = <Practice key={arg} skill={arg as SkillId | 'mix'} />;
    tabs = false;
  } else if (root === 'lesson' && arg) {
    body = <LessonView key={arg} id={Number(arg)} go={go} />;
    tabs = false;
  } else if (root === 'lessons') body = <LessonList go={go} />;
  else if (root === 'stats') body = <Stats />;
  else if (root === 'settings') body = <Settings />;
  else if (root === 'glossary') { body = <Glossary />; tabs = false; }
  else body = <Home go={go} />;

  const tab = root === 'lessons' ? 'lessons' : root === 'stats' ? 'stats' : root === 'settings' ? 'settings' : 'home';
  const T = ({ id, label, icon, path }: { id: string; label: string; icon: React.ReactNode; path: string }) => (
    <button className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => go(path)}>{icon}{label}</button>
  );
  return (
    <div className="app">
      {body}
      {tabs && (
        <nav className="tabbar" aria-label="Main">
          <div className="tabbar-inner">
            <T id="home" label="Practice" icon={Icon.practice} path="/" />
            <T id="lessons" label="Lessons" icon={Icon.book} path="/lessons" />
            <T id="stats" label="Progress" icon={Icon.chart} path="/stats" />
            <T id="settings" label="Settings" icon={Icon.gear} path="/settings" />
          </div>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StateProvider>
      <GlossaryProvider>
        <Shell />
      </GlossaryProvider>
    </StateProvider>
  );
}
