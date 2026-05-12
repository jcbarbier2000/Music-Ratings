export default async function handler(req, res) {
  const { term, entity = 'album', limit = 6 } = req.query

  if (!term) {
    return res.status(400).json({ error: 'term is required' })
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=${entity}&limit=${limit}&media=music`
    const response = await fetch(url)
    const data = await response.json()
    res.setHeader('Cache-Control', 's-maxage=3600')
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
