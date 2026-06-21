export interface Photo {
  title: string;
  details: string;
  format: string;
  price: string;
  img: string;
  pcat: string;
  pres: string;
}

export interface Video {
  title: string;
  details: string;
  format: string;
  duration: string;
  price: string;
  img: string;
  videoUrl: string;
  vcat: string;
  vdur: string;
}

export const photosData: Photo[] = [
  {
    title: "Estuaire du Gabon — panoramique",
    details: "Photo 4K · 8 000 × 5 333 px · RAW + JPEG",
    format: "RAW + JPEG",
    price: "3 000 FCFA",
    img: "https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=1600&h=1200&fit=crop",
    pcat: "paysages",
    pres: "4k"
  },
  {
    title: "Forêt équatoriale — Ogooué",
    details: "Photo 4K · 8 000 × 5 333 px · RAW + JPEG",
    format: "RAW + JPEG",
    price: "3 000 FCFA",
    img: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&h=1200&fit=crop",
    pcat: "nature",
    pres: "4k"
  },
  {
    title: "Libreville by night — Port",
    details: "Photo HD · 6 000 × 4 000 px · JPEG",
    format: "JPEG",
    price: "1 500 FCFA",
    img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&h=1200&fit=crop",
    pcat: "archi",
    pres: "hd"
  },
  {
    title: "Côte atlantique — plage sauvage",
    details: "Photo HD · 6 000 × 4 000 px · JPEG",
    format: "JPEG",
    price: "1 500 FCFA",
    img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&h=1200&fit=crop",
    pcat: "nature",
    pres: "hd"
  },
  {
    title: "Lagune Fernan Vaz — coucher de soleil",
    details: "Photo 4K · 8 000 × 5 333 px · RAW",
    format: "RAW",
    price: "3 000 FCFA",
    img: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&h=1200&fit=crop",
    pcat: "paysages",
    pres: "4k"
  },
  {
    title: "Village traditionnel — Haut-Ogooué",
    details: "Photo HD · 6 000 × 4 000 px · JPEG",
    format: "JPEG",
    price: "1 500 FCFA",
    img: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1600&h=1200&fit=crop",
    pcat: "culture",
    pres: "hd"
  },
  {
    title: "Pont de l'Ogooué — vue aérienne 4K",
    details: "Photo 4K · 8 000 × 5 333 px · RAW",
    format: "RAW",
    price: "3 000 FCFA",
    img: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&h=1200&fit=crop",
    pcat: "archi",
    pres: "4k"
  },
  {
    title: "Parc national Lopé — survol drone",
    details: "Photo HD · 6 000 × 4 000 px · JPEG",
    format: "JPEG",
    price: "1 500 FCFA",
    img: "https://images.unsplash.com/photo-1511497584788-876760111969?w=1600&h=1200&fit=crop",
    pcat: "paysages",
    pres: "hd"
  },
  {
    title: "Fête nationale — stade, survol",
    details: "Photo HD · 6 000 × 4 000 px · JPEG",
    format: "JPEG",
    price: "1 500 FCFA",
    img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&h=1200&fit=crop",
    pcat: "events",
    pres: "hd"
  },
  {
    title: "Mangroves gabonaises — delta",
    details: "Photo 4K · 8 000 × 5 333 px · RAW",
    format: "RAW",
    price: "3 000 FCFA",
    img: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1600&h=1200&fit=crop",
    pcat: "nature",
    pres: "4k"
  },
  {
    title: "Marché de Libreville — vue aérienne",
    details: "Photo HD · 6 000 × 4 000 px · JPEG",
    format: "JPEG",
    price: "1 500 FCFA",
    img: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1600&h=1200&fit=crop",
    pcat: "culture",
    pres: "hd"
  },
  {
    title: "Baie de Corisco — eaux turquoise",
    details: "Photo 4K · 8 000 × 5 333 px · RAW",
    format: "RAW",
    price: "3 000 FCFA",
    img: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&h=1200&fit=crop",
    pcat: "paysages",
    pres: "4k"
  }
];

export const videosData: Video[] = [
  {
    title: "Estuaire du Gabon — drone 4K",
    details: "Vidéo 30s · 4K UHD · MP4 · 30fps",
    format: "MP4",
    duration: "0:30",
    price: "5 000 FCFA",
    img: "https://images.unsplash.com/photo-1518623489648-a173ef7824f3?w=1200&h=680&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    vcat: "paysages",
    vdur: "30"
  },
  {
    title: "Forêt équatoriale — survol Ogooué",
    details: "Vidéo 1min · 4K UHD · MP4 · 60fps",
    format: "MP4",
    duration: "1:00",
    price: "10 000 FCFA",
    img: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&h=680&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    vcat: "nature",
    vdur: "60"
  },
  {
    title: "Fête nationale Gabon — stade, 4K",
    details: "Vidéo 1min · 4K UHD · MP4 · 60fps",
    format: "MP4",
    duration: "1:00",
    price: "10 000 FCFA",
    img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=680&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    vcat: "events",
    vdur: "60"
  },
  {
    title: "Libreville by night — architecture",
    details: "Vidéo 30s · 4K UHD · MP4 · 30fps",
    format: "MP4",
    duration: "0:30",
    price: "5 000 FCFA",
    img: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&h=680&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    vcat: "archi",
    vdur: "30"
  },
  {
    title: "Côte atlantique — vagues & plage",
    details: "Vidéo 30s · 4K UHD · MP4 · 30fps",
    format: "MP4",
    duration: "0:30",
    price: "5 000 FCFA",
    img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=680&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    vcat: "nature",
    vdur: "30"
  },
  {
    title: "Lagune Fernan Vaz — coucher de soleil",
    details: "Vidéo 1min · 4K UHD · MP4 · 60fps",
    format: "MP4",
    duration: "1:00",
    price: "10 000 FCFA",
    img: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&h=680&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    vcat: "paysages",
    vdur: "60"
  },
  {
    title: "Culture gabonaise — village drone",
    details: "Vidéo 30s · 4K UHD · MP4 · 30fps",
    format: "MP4",
    duration: "0:30",
    price: "5 000 FCFA",
    img: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&h=680&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    vcat: "culture",
    vdur: "30"
  },
  {
    title: "Parc national Lopé — faune & forêt",
    details: "Vidéo 1min · 4K UHD · MP4 · 60fps",
    format: "MP4",
    duration: "1:00",
    price: "10 000 FCFA",
    img: "https://images.unsplash.com/photo-1511497584788-876760111969?w=1200&h=680&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
    vcat: "nature",
    vdur: "60"
  },
  {
    title: "Baie de Corisco — eaux turquoise",
    details: "Vidéo 30s · 4K UHD · MP4 · 30fps",
    format: "MP4",
    duration: "0:30",
    price: "5 000 FCFA",
    img: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=680&fit=crop",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    vcat: "paysages",
    vdur: "30"
  }
];
