export default function LibrarySearch({ initialQuery = '' }: { initialQuery?: string }) {
  return <form action="/library/search" className="explore-search">
    <label className="sr-only" htmlFor="library-query">搜索整理节录</label>
    <input id="library-query" name="q" defaultValue={initialQuery} placeholder="搜索整理节录，如：七杀朝斗、化忌、紫微" maxLength={200} required />
    <button className="studio-button" type="submit">搜索节录 ↗</button>
  </form>;
}
