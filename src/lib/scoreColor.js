export const scoreColor = (score) => {
  if (!score) return '#52525b'
  const s = Math.min(10, Math.max(0, score))
  if (s <= 5) {
    const g = Math.round((s / 5) * 200)
    return `rgb(220, ${g}, 30)`
  } else {
    const r = Math.round(220 - ((s - 5) / 5) * 180)
    const g = Math.round(160 + ((s - 5) / 5) * 60)
    return `rgb(${r}, ${g}, 30)`
  }
}
