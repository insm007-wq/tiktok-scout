'use client'

interface Comment {
  author: string
  text: string
  likes: number
  replies: number
}

interface CommentsModalProps {
  isOpen: boolean
  videoTitle: string
  comments: Comment[]
  totalReplies: number
  totalLikes: number
  isLoading: boolean
  onClose: () => void
}

export default function CommentsModal({
  isOpen,
  videoTitle,
  comments,
  totalReplies,
  totalLikes,
  isLoading,
  onClose,
}: CommentsModalProps) {
  if (!isOpen) return null

  const avgLikes = comments.length > 0 ? Math.round(totalLikes / comments.length) : 0

  return (
    <>
      <div
        className="comments-modal"
        style={{ display: isOpen ? 'flex' : 'none' }}
        onClick={onClose}
      >
        <div
          className="comments-modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="comments-modal-header">
            <div className="comments-modal-title">
              📬 {videoTitle.substring(0, 30)}{videoTitle.length > 30 ? '...' : ''} 댓글 분석
            </div>
            <button
              className="comments-modal-close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {isLoading ? (
            <div className="comments-loading">댓글을 불러오는 중...</div>
          ) : comments.length === 0 ? (
            <div style={{ color: '#999', padding: '20px', textAlign: 'center' }}>
              댓글이 없습니다
            </div>
          ) : (
            <>
              <div className="comments-stats">
                <div className="comment-stat-item">
                  <div className="comment-stat-label">총 댓글</div>
                  <div className="comment-stat-value">{comments.length}</div>
                </div>
                <div className="comment-stat-item">
                  <div className="comment-stat-label">총 답글</div>
                  <div className="comment-stat-value">{totalReplies}</div>
                </div>
                <div className="comment-stat-item">
                  <div className="comment-stat-label">총 좋아요</div>
                  <div className="comment-stat-value">{totalLikes}</div>
                </div>
                <div className="comment-stat-item">
                  <div className="comment-stat-label">평균 좋아요</div>
                  <div className="comment-stat-value">{avgLikes}</div>
                </div>
              </div>

              <div className="comments-list">
                {comments.map((comment, index) => (
                  <div key={index} className="comment-item">
                    <div className="comment-author">{comment.author}</div>
                    <div className="comment-text">{comment.text}</div>
                    <div className="comment-meta">
                      <span className="comment-likes">👍 {comment.likes}</span>
                      {comment.replies > 0 && (
                        <span className="comment-replies">💬 {comment.replies}개 답글</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center', padding: '10px', color: '#999', fontSize: '11px' }}>
                상위 20개 댓글만 표시됩니다
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
