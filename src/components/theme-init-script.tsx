export function ThemeInitScript() {
    const js = `(() => {
    try {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add('dark');
      let meta = document.querySelector('meta[name="color-scheme"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'color-scheme');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', 'dark');
    } catch (_) {}
  })();`

    return (
        <script id="theme-init" suppressHydrationWarning>
            {js}
        </script>
    )
}
