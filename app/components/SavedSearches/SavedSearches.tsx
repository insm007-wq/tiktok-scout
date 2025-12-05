'use client';

import { useState, useEffect } from 'react';
import { BookmarkPlus } from 'lucide-react';
import './SavedSearches.css';

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  createdAt: number;
}

interface SavedSearchesProps {
  onSearchLoad: (query: string) => void;
}

export default function SavedSearches({ onSearchLoad }: SavedSearchesProps) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchName, setSearchName] = useState('');
  const MAX_SAVED_SEARCHES = 10;
  const STORAGE_KEY = 'youtube-scout-saved-searches';

  // 초기 로드
  useEffect(() => {
    loadSavedSearches();
  }, []);

  // localStorage에서 저장된 검색 불러오기
  const loadSavedSearches = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const searches = JSON.parse(stored) as SavedSearch[];
        // 최신순 정렬 (createdAt 기준 내림차순)
        searches.sort((a, b) => b.createdAt - a.createdAt);
        setSavedSearches(searches);
      }
    } catch (error) {
      console.error('저장된 검색 불러오기 오류:', error);
    }
  };

  // 검색어 저장
  const handleSaveSearch = () => {
    if (!searchName.trim()) {
      return;
    }

    try {
      const newSearch: SavedSearch = {
        id: Date.now().toString(),
        name: searchName,
        query: searchName,
        createdAt: Date.now(),
      };

      let searches = [...savedSearches, newSearch];

      // 최대 개수 초과 시 가장 오래된 것 삭제
      if (searches.length > MAX_SAVED_SEARCHES) {
        searches = searches.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_SAVED_SEARCHES);
      }

      // 최신순 정렬
      searches.sort((a, b) => b.createdAt - a.createdAt);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
      setSavedSearches(searches);
      setSearchName('');
    } catch (error) {
      console.error('검색 저장 오류:', error);
    }
  };

  // 저장된 검색 삭제
  const handleDeleteSearch = (id: string) => {
    try {
      const filtered = savedSearches.filter((search) => search.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      setSavedSearches(filtered);
    } catch (error) {
      console.error('검색 삭제 오류:', error);
    }
  };

  // 저장된 검색 불러오기
  const handleLoadSearch = (query: string) => {
    onSearchLoad(query);
  };

  return (
    <div className="saved-searches-section">
      <div className="saved-searches-title">
        <BookmarkPlus size={16} style={{ display: "inline", marginRight: "6px" }} />
        저장된 검색 ({savedSearches.length}/{MAX_SAVED_SEARCHES})
      </div>
      <div className="saved-searches-controls">
        <input
          type="text"
          className="saved-search-name-input"
          placeholder="검색 이름 입력"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSaveSearch();
            }
          }}
        />
        <button className="btn-save-search" onClick={handleSaveSearch}>
          저장
        </button>
      </div>

      {/* 저장된 검색 목록 */}
      <div className="saved-searches-list">
        {savedSearches.map((search) => (
          <div key={search.id} className="saved-search-item">
            <span
              className="saved-search-item-name"
              onClick={() => handleLoadSearch(search.query)}
            >
              {search.name}
            </span>
            <button
              className="saved-search-item-delete"
              onClick={() => handleDeleteSearch(search.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
