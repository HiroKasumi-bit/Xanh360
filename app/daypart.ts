// Which of the hero's four photographs of Saigon to show (scripts/blender/saigon_hero.py): the one for the hour in Ho
// Chi Minh City, which keeps UTC+7 all year. Dawn 5:00–7:30, day until 16:30, sunset until 18:30, night until 5:00.
//
// applyDaypart sets html[data-daypart], which the CSS reads to pick the picture (app/visuals.css), and preloads that
// picture in the frame and size the screen will use (the same breakpoints and densities as the CSS). app/layout.tsx
// inlines it in <head> by its source, so it runs before the first paint and before the CSS asks for an image;
// SaigonScene (app/eco-visual.tsx) calls it again as the hours pass.
// It must stay self-contained (no imports, nothing from outside its own body) and plain enough that the bundler leaves
// it as written: no destructuring or for…of, which could be rewritten into helpers it cannot reach.
export function applyDaypart() {
  const now = new Date();
  const hour = (now.getUTCHours() + 7 + now.getUTCMinutes() / 60) % 24;
  const part = hour >= 5 && hour < 7.5 ? 'dawn' : hour < 16.5 && hour >= 7.5 ? 'day' : hour < 18.5 && hour >= 16.5 ? 'sunset' : 'night';
  const root = document.documentElement;
  if (root.getAttribute('data-daypart') === part) return;
  root.setAttribute('data-daypart', part);
  const frames = [['wide', '1280', '2560', '(min-width: 901px)'], ['tall', '800', '1600', '(min-width: 641px) and (max-width: 900px)'],
    ['tall', '800', '1200', '(max-width: 640px)']];
  for (let i = 0; i < frames.length; i++) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.media = frames[i][3];
    link.setAttribute('imagesrcset', '/hero/saigon-' + part + '-' + frames[i][0] + '-' + frames[i][1] + '.webp 1x, /hero/saigon-' + part + '-' + frames[i][0] + '-' + frames[i][2] + '.webp 2x');
    document.head.appendChild(link);
  }
}
