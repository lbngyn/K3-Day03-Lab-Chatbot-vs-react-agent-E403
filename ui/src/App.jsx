import React, { useState } from 'react';
import Header from './components/Header';
import TabNavigation from './components/TabNavigation';
import ChatStudio from './components/ChatStudio';
import TestRunner from './components/TestRunner';
import TraceInspector from './components/TraceInspector';
import FlowchartView from './components/FlowchartView';
import BookingSidebar from './components/BookingSidebar';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [traceHistory, setTraceHistory] = useState([]);
  
  // Appointments & Booking Drawer State
  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);
  const [selectedPropertyForBooking, setSelectedPropertyForBooking] = useState(null);
  const [appointments, setAppointments] = useState([
    {
      id: "BK-882103",
      property: {
        id: "AP-102",
        title: "Chung cư mini Studio Luxury Cầu Giấy",
        address: "123 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội",
        price: 7.5,
        image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80",
        salesName: "Nguyễn Văn Anh",
        salesPhone: "0988.123.456"
      },
      date: "2026-07-29",
      timeSlot: "15:00 - 17:00",
      customerName: "Nguyễn Văn Khách",
      customerPhone: "0988123456",
      salesName: "Nguyễn Văn Anh",
      salesPhone: "0988.123.456",
      status: "CONFIRMED"
    }
  ]);

  const handleNewTrace = (newTrace) => {
    setTraceHistory(prev => [newTrace, ...prev]);

    // If trace produced a booking result, append to appointments
    if (newTrace.bookingResult && newTrace.bookingResult.status === "BOOKED") {
      const b = newTrace.bookingResult;
      setAppointments(prev => [
        {
          id: b.booking_id,
          property: b.property,
          date: "2026-07-29",
          timeSlot: "15:00 - 17:00",
          customerName: "Nguyễn Văn Khách",
          customerPhone: "0988123456",
          salesName: b.property.salesName,
          salesPhone: b.property.salesPhone,
          status: "CONFIRMED"
        },
        ...prev
      ]);
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
        activeToolsCount={3} 
        appointmentsCount={appointments.length}
        avgLatency={traceHistory.length > 0 ? `${Math.round(traceHistory.reduce((a, b) => a + b.executionTimeMs, 0) / traceHistory.length)}ms` : '320ms'} 
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
