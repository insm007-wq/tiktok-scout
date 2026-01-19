'use client'

import { useState, useCallback } from 'react'
import DaumPostcode from 'react-daum-postcode'
import { MapPin, X } from 'lucide-react'

interface AddressInputProps {
  value: {
    zipCode: string
    address: string
    detailAddress: string
  }
  onChange: (address: { zipCode: string; address: string; detailAddress: string }) => void
  error?: string
}

export default function AddressInput({ value, onChange, error }: AddressInputProps) {
  const [showPostcode, setShowPostcode] = useState(false)

  const handleSelectAddress = useCallback(
    (data: any) => {
      onChange({
        zipCode: data.zonecode,
        address: data.address,
        detailAddress: value.detailAddress,
      })
      setShowPostcode(false)
    },
    [onChange, value.detailAddress]
  )

  return (
    <div className="space-y-3">
      {/* Daum Postcode 모달 */}
      {showPostcode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full mx-4 border border-white/20">
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <h3 className="text-lg font-semibold text-white">주소 검색</h3>
              <button
                onClick={() => setShowPostcode(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors text-white/70"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[500px] overflow-auto">
              <DaumPostcode onComplete={handleSelectAddress} />
            </div>
          </div>
        </div>
      )}

      {/* 우편번호 */}
      <div>
        <label className="block text-sm font-medium text-white/90 mb-2">
          우편번호 <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={value.zipCode}
            readOnly
            placeholder="우편번호"
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 cursor-not-allowed"
          />
          <button
            type="button"
            onClick={() => setShowPostcode(true)}
            className="px-4 py-3 bg-gradient-to-r from-pink-500 to-cyan-400 text-black rounded-lg hover:shadow-[0_0_20px_rgba(254,44,85,0.5)] transition-all font-semibold"
          >
            검색
          </button>
        </div>
      </div>

      {/* 주소 */}
      <div>
        <label className="block text-sm font-medium text-white/90 mb-2">
          주소 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={value.address}
          readOnly
          placeholder="주소"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 cursor-not-allowed"
        />
      </div>

      {/* 상세주소 */}
      <div>
        <label className="block text-sm font-medium text-white/90 mb-2">
          상세주소 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={value.detailAddress}
          onChange={(e) =>
            onChange({
              ...value,
              detailAddress: e.target.value,
            })
          }
          placeholder="상세주소 (예: 101호)"
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
        />
        {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      </div>

      {/* 주소 미리보기 */}
      {value.address && (
        <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-lg p-3 flex gap-3">
          <MapPin size={20} className="text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-white/80">
            <p className="font-medium text-white">{value.zipCode}</p>
            <p>{value.address}</p>
            {value.detailAddress && <p className="text-white/70">{value.detailAddress}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
