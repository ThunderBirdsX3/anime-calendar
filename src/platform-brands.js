// Brand colors and icon shapes from AniList externalLinks; assets are served locally.
export const PLATFORM_BRANDS = [
  {
    "site": "YouTube",
    "id": "youtube",
    "color": "#FF0000",
    "source": "https://s4.anilist.co/file/anilistcdn/link/icon/13-ZwR1Xwgtyrwa.png"
  },
  {
    "site": "Crunchyroll",
    "id": "crunchyroll",
    "color": "#F88B24",
    "source": "https://s4.anilist.co/file/anilistcdn/link/icon/5-AWN2pVlluCOO.png"
  },
  {
    "site": "Bilibili TV",
    "id": "bilibili",
    "color": "#00A1D6",
    "source": "https://s4.anilist.co/file/anilistcdn/link/icon/119-NCwGvCjFADGQ.png"
  },
  {
    "site": "HIDIVE",
    "id": "hidive",
    "color": "#03AEEF",
    "source": "https://s4.anilist.co/file/anilistcdn/link/icon/20-3nWxygrjVM5A.png"
  },
  {
    "site": "Amazon Prime Video",
    "id": "amazon-prime-video",
    "color": "#FF9900",
    "source": "https://s4.anilist.co/file/anilistcdn/link/icon/21-bDoNIomehkOx.png"
  },
  {
    "site": "iQ",
    "id": "iqiyi",
    "color": "#00CC36",
    "source": "https://s4.anilist.co/file/anilistcdn/link/icon/122-EPBJ2E0oPt5C.png"
  },
  {
    "site": "Netflix",
    "id": "netflix",
    "color": "#E50914",
    "source": "https://s4.anilist.co/file/anilistcdn/link/icon/10-rVGPom8RCiwH.png"
  },
  {
    "site": "Hulu",
    "id": "hulu",
    "color": "#1CE783",
    "source": "https://s4.anilist.co/file/anilistcdn/link/icon/7-rM06PQyWONGC.png"
  },
  {
    "site": "Crackle",
    "id": "crackle",
    "color": "#FF5A16",
    "source": "https://s4.anilist.co/file/anilistcdn/link/icon/34-oHO1UvONDlYV.png"
  },
  {
    "site": "Tubi TV",
    "id": "tubi",
    "color": "#7408FF",
    "source": "https://s4.anilist.co/file/anilistcdn/link/icon/30-RoKDJtmAVpZK.png"
  },
  {
    "site": "OceanVeil",
    "id": "oceanveil",
    "color": "#00D0D3",
    "source": "https://s4.anilist.co/file/anilistcdn/link/icon/249-CFCxdC7MiNX3.png"
  },
  {
    "site": "Prime Video",
    "id": "prime-video",
    "color": "#1A98FF",
    "source": "https://s4.anilist.co/file/anilistcdn/link/icon/261-I11R5ZZpcwgD.png"
  },
  {
    "site": "Disney Plus",
    "id": "disney-plus",
    "color": "#21037C",
    "source": "https://s4.anilist.co/file/anilistcdn/link/icon/118-mphNAqNDTvhO.png"
  }
];
export const brandForSite = site => PLATFORM_BRANDS.find(brand => brand.site.toLowerCase() === String(site).toLowerCase())?.id || '';
