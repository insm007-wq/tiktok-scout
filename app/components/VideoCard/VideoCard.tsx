"use client";

import TagAnalysis from "@/app/components/TagAnalysis/TagAnalysis";
import { Tooltip } from "@/app/components/ui/Tooltip";
import {
  Eye,
  Users,
  TrendingUp,
  Zap,
  Play,
  MessageCircle,
  LinkIcon,
  Film,
  Car,
  Music,
  PawPrint,
  Trophy,
  Plane,
  Gamepad2,
  Video,
  Tv,
  Megaphone,
  Smile,
  Newspaper,
  ShoppingBag,
  Cpu,
  Clapperboard,
  Calendar,
  BookOpen,
  Microscope,
  Palette,
  PlayCircle,
  Mic2,
} from "lucide-react";
import "./VideoCard.css";

// lucide-react 아이콘 매핑
const iconMap: Record<string, any> = {
  Film: Film,
  Car: Car,
  Music: Music,
  PawPrint: PawPrint,
  Trophy: Trophy,
  Plane: Plane,
  Gamepad2: Gamepad2,
  Video: Video,
  Tv: Tv,
  Megaphone: Megaphone,
  Smile: Smile,
  Newspaper: Newspaper,
  ShoppingBag: ShoppingBag,
  Cpu: Cpu,
  Clapperboard: Clapperboard,
  Calendar: Calendar,
  BookOpen: BookOpen,
  Microscope: Microscope,
  Palette: Palette,
  PlayCircle: PlayCircle,
  Mic2: Mic2,
};

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
    viewCount: number;
    subscriberCount: number;
    duration?: string;
    publishedAt?: string;
    tags?: string[];
    channelId?: string;
    categoryName?: string;
    categoryIcon?: string;
    categoryId?: string;
  };
  showVPH?: boolean;
  vph?: number;
  onChannelClick?: (channelId: string, channelTitle: string) => void;
  onCommentsClick?: (videoId: string, videoTitle: string) => void;
}

// 숫자 포맷팅 함수
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
};

// 기간 파싱 함수 (ISO 8601 duration format)
const parseDuration = (duration: string): number => {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  return hours * 3600 + minutes * 60 + seconds;
};

// 기간 포맷팅 함수
const formatDuration = (seconds: number): string => {
  if (seconds === 0) return "0초";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }
  if (minutes > 0) {
    return `${minutes}분 ${secs}초`;
  }
  return `${secs}초`;
};

// 참여율 계산 함수
const calculateEngagementRatio = (viewCount: number, subscriberCount: number): number => {
  if (subscriberCount === 0) return 0;
  return viewCount / subscriberCount;
};

// 참여율 단계 계산
const getEngagementLevel = (ratio: number): number => {
  if (ratio < 0.2) return 1;
  if (ratio < 0.6) return 2;
  if (ratio < 1.4) return 3;
  if (ratio < 3.0) return 4;
  return 5;
};

// VPH 계산 함수
const calculateVPH = (viewCount: number, publishedAt: string): number => {
  if (!publishedAt) return 0;
  const publishDate = new Date(publishedAt).getTime();
  const now = new Date().getTime();
  const hours = (now - publishDate) / (1000 * 60 * 60);
  return hours > 0 ? viewCount / hours : 0;
};

export default function VideoCard({ video, showVPH = false, vph, onChannelClick, onCommentsClick }: VideoCardProps) {
  const {
    id,
    title,
    channelTitle,
    thumbnail,
    viewCount,
    subscriberCount,
    duration,
    publishedAt,
    tags,
    channelId,
    categoryName,
    categoryIcon,
  } = video;

  const viewCountText = formatNumber(viewCount);
  const subscriberText = subscriberCount > 0 ? formatNumber(subscriberCount) : "미공개";

  const durationSeconds = parseDuration(duration || "");
  const durationText = formatDuration(durationSeconds);

  const engagementRatio = calculateEngagementRatio(viewCount, subscriberCount);
  const engagementLevel = getEngagementLevel(engagementRatio);
  const ratioText = subscriberCount > 0 ? engagementRatio.toFixed(2) : "N/A";

  const calculatedVPH = vph || calculateVPH(viewCount, publishedAt || "");
  const vphText = formatNumber(Math.round(calculatedVPH));

  const badgeClass = `engagement-badge engagement-${engagementLevel}`;
  const videoLink = `https://www.youtube.com/watch?v=${id}`;

  return (
    <div className="video-card">
      <a href={videoLink} target="_blank" rel="noopener noreferrer" style={{ position: "relative", textDecoration: "none" }}>
        <img src={thumbnail} alt={title} className="video-thumbnail" />
        <div className="video-duration">{durationText}</div>
      </a>
      <div className="video-info">
        <div className="video-title">{title}</div>
        <div className="video-channel">{channelTitle}</div>

        {/* stats */}
        <div className="video-stats">
          <Tooltip content="영상의 총 조회수" placement="top" variant="glassmorphic">
            <div className="stat-item">
              <Eye size={16} style={{ marginRight: "4px" }} />
              {viewCountText}
            </div>
          </Tooltip>
          <Tooltip content="채널의 총 구독자 수" placement="top" variant="glassmorphic">
            <div className="stat-item">
              <Users size={16} style={{ marginRight: "4px" }} />
              {subscriberText}
            </div>
          </Tooltip>
        </div>

        <div className="video-stats">
          <Tooltip content="조회수/구독자 비율" placement="top" variant="glassmorphic">
            <div className="stat-item">
              <TrendingUp size={16} style={{ marginRight: "4px" }} />
              {ratioText}
            </div>
          </Tooltip>

          {showVPH && (
            <Tooltip content="시간당 조회수" placement="top" variant="glassmorphic">
              <div className="stat-item">
                <Zap size={16} style={{ marginRight: "4px" }} />
                VPH: {vphText}
              </div>
            </Tooltip>
          )}
        </div>

        {/* badge */}
        <div className="badge-container">
          <Tooltip
            content={
              engagementLevel === 1
                ? "매우 낮음 (0.2배 미만)"
                : engagementLevel === 2
                ? "낮음 (0.2~0.6배)"
                : engagementLevel === 3
                ? "보통 (0.6~1.4배)"
                : engagementLevel === 4
                ? "높음 (1.4~3.0배)"
                : "매우 높음 (3.0배+, 바이럴)"
            }
            placement="top"
            variant="glassmorphic"
          >
            <div className={badgeClass}>{engagementLevel}단계</div>
          </Tooltip>

          {categoryName && (
            <Tooltip content="카테고리" placement="top" variant="glassmorphic">
              <div className="text-badge">{categoryName}</div>
            </Tooltip>
          )}
        </div>

        <TagAnalysis tags={tags} title={title} />

        {/* Buttons */}
        <div className="video-buttons">
          <button
            className="btn-view-channel"
            onClick={(e) => {
              e.preventDefault();
              onChannelClick?.(channelId || id, channelTitle);
            }}
          >
            <Play size={12} />
            채널
          </button>

          <button
            className="btn-view-comments"
            onClick={(e) => {
              e.preventDefault();
              onCommentsClick?.(id, title);
            }}
          >
            <MessageCircle size={12} />
            댓글
          </button>
        </div>
      </div>
    </div>
  );
}
