interface StatsBarProps {
  photoCount: number;
  videoCount: number;
}

export default function StatsBar({ photoCount, videoCount }: StatsBarProps) {
  return (
    <div className="stats-bar">
      <div className="stat-item">
        <div className="stat-icon"><i className="ti ti-photo"></i></div>
        <div>
          <div className="stat-num">{photoCount}</div>
          <div className="stat-lbl">Photos disponibles</div>
        </div>
      </div>
      <div className="stat-item">
        <div className="stat-icon"><i className="ti ti-video"></i></div>
        <div>
          <div className="stat-num">{videoCount}</div>
          <div className="stat-lbl">Vidéos disponibles</div>
        </div>
      </div>
      <div className="stat-item">
        <div className="stat-icon"><i className="ti ti-map-pin"></i></div>
        <div>
          <div className="stat-num">9</div>
          <div className="stat-lbl">Provinces du Gabon</div>
        </div>
      </div>
      <div className="stat-item">
        <div className="stat-icon"><i className="ti ti-shield-check"></i></div>
        <div>
          <div className="stat-num">100%</div>
          <div className="stat-lbl">Droits commerciaux inclus</div>
        </div>
      </div>
    </div>
  );
}
