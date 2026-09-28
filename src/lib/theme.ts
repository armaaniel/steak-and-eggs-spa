export const currentTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

export const toggleTheme = () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  localStorage.setItem('theme', next)
  return next
}
