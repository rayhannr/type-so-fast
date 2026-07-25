import { MetadataRoute } from 'next'

const BASE_URL = 'https://typesofast.rayhannr.dev'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/about', '/pvc', '/pvp', '/room', '/leaderboard', '/achievements', '/stats', '/friends']

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date()
  }))
}
