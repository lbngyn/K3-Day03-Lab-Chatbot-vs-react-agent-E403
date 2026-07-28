import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Phone, User, CheckCircle2, Building, ShieldCheck, ArrowRight } from 'lucide-react';

export default function BookingSidebar({ isOpen, onClose, selectedProperty, appointments, onConfirmBooking }) {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('14:00 - 16:00');
  const [bookingDate, setBookingDate] = useState('2026-07-29');
  const [customerName, setCustomerName] = useState('Nguyễn Văn Khách');
  const [customerPhone, setCustomerPhone] = useState('0988123456');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedProperty) {
      setNote(`Xem căn hộ ${selectedProperty.title}`);
    }
  }, [selectedProperty]);

  if (!isOpen) return null;

  const handleSubmitBooking = (e) => {
    e.preventDefault();
    if (!selectedProperty) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const newBooking = {
        id: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
        property: selectedProperty,
        date: bookingDate,
        timeSlot: selectedTimeSlot,
        customerName,
        customerPhone,
        salesName: selectedProperty.salesName || 'Nguyễn Văn Anh',
        salesPhone: selectedProperty.salesPhone || '0988.123.456',
        status: 'CONFIRMED',
        createdTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      onConfirmBooking(newBooking);
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-indigo-100" />
              </div>
              <div>
                <h3 className="font-bold text-base tracking-tight">Sổ Tay Lịch Hẹn Xem Nhà</h3>
                <p className="text-xs text-indigo-100">Quản lý & Đặt lịch xem nhà thực tế</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-indigo-100 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body Scroll */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Active Appointments List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Lịch Hẹn Của Tôi ({appointments.length})</span>
                </h4>
              </div>

              {appointments.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-dashed border-slate-200 text-slate-400 text-xs">
                  Chưa có lịch hẹn nào. Vui lòng chọn căn hộ trong chat để đặt lịch.
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          Mã {apt.id}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Đã xác nhận</span>
                        </span>
                      </div>

                      <div className="font-bold text-slate-800 text-xs">
                        {apt.property?.title}
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{apt.property?.address}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-indigo-700 font-medium">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{apt.date}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{apt.timeSlot}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 text-slate-700 pt-1 border-t border-emerald-100">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Nhân viên tư vấn: <b>{apt.salesName}</b> ({apt.salesPhone})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Booking Form (If Property Selected) */}
            {selectedProperty ? (
              <form onSubmit={handleSubmitBooking} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-900 text-xs">
                    Đặt Lịch Xem Căn Hộ
                  </h4>
                </div>

                {/* Property Selected Info Preview */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-start space-x-3">
                  <img 
                    src={selectedProperty.image} 
                    alt={selectedProperty.title} 
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                  <div className="text-xs space-y-0.5 leading-tight">
                    <div className="font-bold text-slate-900 line-clamp-1">{selectedProperty.title}</div>
                    <div className="text-slate-500 line-clamp-1">{selectedProperty.address}</div>
                    <div className="text-indigo-600 font-bold pt-1">{selectedProperty.price} triệu/tháng</div>
                  </div>
                </div>

                {/* Date Selection */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Chọn Ngày Xem Nhà:</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Time Slot Selection */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Chọn Khung Giờ Rảnh:</label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {['09:00 - 11:00', '14:00 - 16:00', '17:00 - 19:00'].map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`py-2 px-1 rounded-xl font-medium border text-[11px] text-center transition-all ${
                          selectedTimeSlot === slot
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone number */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Số Điện Thoại Liên Hệ:</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0988xxxxxx"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-mono"
                    required
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-200 flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <span>Đang gửi thông tin đặt lịch...</span>
                  ) : (
                    <>
                      <span>🚀 Xác Nhận Đặt Lịch Xem Nhà</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 text-xs text-indigo-900 space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <span>💡 Gợi ý:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Hãy chat với Trợ lý để tìm căn hộ thích hợp (Ví dụ: <i>"Tìm phòng trọ khu Cầu Giấy dưới 8 triệu"</i>). Sau đó bấm nút <b>[📅 Đặt Lịch Xem Nhà]</b> trên căn hộ bạn thích!
                </p>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 text-[11px] text-slate-400 bg-slate-50 flex items-center justify-between">
            <span>Trợ Lý Đặt Lịch Xem Nhà</span>
            <span>Hỗ trợ 24/7</span>
          </div>

        </div>
      </div>
    </div>
  );
}
