import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TabNavigation from './components/TabNavigation';
import ChatStudio from './components/ChatStudio';
import TestRunner from './components/TestRunner';
import TraceInspector from './components/TraceInspector';
import FlowchartView from './components/FlowchartView';
import BookingSidebar from './components/BookingSidebar';
import { checkBackendStatus } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [traceHistory, setTraceHistory] = useState([]);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [activeToolsCount, setActiveToolsCount] = useState(3);
  
  // Appointments & Booking Drawer State
  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);
  const [selectedPropertyForBooking, setSelectedPropertyForBooking] = useState(null);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    async function verifyBackend() {
      const res = await checkBackendStatus();
      setIsBackendOnline(res.online);
      if (res.availableTools && res.availableTools.length > 0) {
        setActiveToolsCount(res.availableTools.length);
      }
    }
    verifyBackend();
    const timer = setInterval(verifyBackend, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleNewTrace = (newTrace) => {
    setTraceHistory(prev => [newTrace, ...prev]);

    // Trích xuất kết quả đặt lịch thực tế từ ReAct Agent tool call (contact_sales)
    if (newTrace.bookingResult && (newTrace.bookingResult.status === "BOOKED" || newTrace.bookingResult.status === "SUCCESS")) {
      const b = newTrace.bookingResult;
      const prop = b.property || {};
      
      const newAppointment = {
        id: b.booking_id || `BK-${Math.floor(100000 + Math.random() * 900000)}`,
        property: {
          id: prop.id || "AP-102",
          title: prop.title || "Căn hộ đã chọn",
          address: prop.address || "Địa chỉ theo tin đăng",
          price: prop.price || "Thỏa thuận",
          image: prop.image || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80",
          salesName: prop.salesName || "Chuyên viên tư vấn",
          salesPhone: prop.salesPhone || "0988.123.456"
        },
        date: b.scheduled_time || "2026-07-29",
        timeSlot: "Lịch xem trực tiếp",
        customerName: b.customer_name || "Khách hàng",
        customerPhone: b.customer_phone || "Chưa cung cấp",
        salesName: prop.salesName || "Chuyên viên tư vấn",
        salesPhone: prop.salesPhone || "0988.123.456",
        status: "CONFIRMED"
      };

      setAppointments(prev => [newAppointment, ...prev]);
    }
  };

  const handleOpenBookingForProperty = (property) => {
    setSelectedPropertyForBooking(property);
    setIsBookingDrawerOpen(true);
  };

  const handleConfirmBooking = (newBooking) => {
    setAppointments(prev => [newBooking, ...prev]);
    setIsBookingDrawerOpen(false);

    // Record trace log for contact_sales
    const newTrace = {
      mode: "react",
      query: `Đặt lịch xem nhà căn hộ ${newBooking.property.title}`,
      steps: [
        {
          stepNumber: 1,
          thought: `Khách hàng đặt lịch xem căn ${newBooking.property.id} vào lúc ${newBooking.timeSlot} ngày ${newBooking.date}. Gọi tool contact_sales.`,
          action: "contact_sales",
          actionArgs: {
            property_id: newBooking.property.id,
            preferred_time: `${newBooking.timeSlot} ${newBooking.date}`,
            customer_phone: newBooking.customerPhone
          },
          observation: `Đã xác nhận lịch hẹn ${newBooking.id} với Sales ${newBooking.salesName}`
        }
      ],
      finalAnswer: `✅ Đã đặt lịch hẹn xem nhà thành công với Sales ${newBooking.salesName}!`,
      guardrailTriggered: false,
      iterations: 1,
      executionTimeMs: 340
    };

    setTraceHistory(prev => [newTrace, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Fixed Header */}
      <Header 
        activeToolsCount={activeToolsCount} 
        appointmentsCount={appointments.length}
        avgLatency={traceHistory.length > 0 ? `${Math.round(traceHistory.reduce((a, b) => a + b.executionTimeMs, 0) / traceHistory.length)}ms` : '320ms'} 
        isBackendOnline={isBackendOnline}
        onOpenBookingSidebar={() => {
          setSelectedPropertyForBooking(null);
          setIsBookingDrawerOpen(true);
        }}
      />


      {/* Primary Tab Navigation */}
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Tab Content Display */}
      <main className="flex-1">
        {activeTab === 'chat' && (
          <ChatStudio 
            onNewTrace={handleNewTrace} 
            onOpenBookingForProperty={handleOpenBookingForProperty}
          />
        )}

        {activeTab === 'runner' && (
          <TestRunner onNewTrace={handleNewTrace} />
        )}

        {activeTab === 'trace' && (
          <TraceInspector traceHistory={traceHistory} />
        )}

        {activeTab === 'flowchart' && (
          <FlowchartView />
        )}
      </main>

      {/* Right Booking Sidebar Drawer */}
      <BookingSidebar
        isOpen={isBookingDrawerOpen}
        onClose={() => setIsBookingDrawerOpen(false)}
        selectedProperty={selectedPropertyForBooking}
        appointments={appointments}
        onConfirmBooking={handleConfirmBooking}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400">
        Trợ Lý Thuê Nhà AI Studio • React + Tailwind CSS Light Theme • Tools: find_houses, rerank, contact_sales
      </footer>

    </div>
  );
}
