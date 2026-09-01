import React, { useState, useEffect } from 'react';
import CalendarView from '../components/history/CalendarView';
import DayDetail from '../components/history/DayDetail';
import SearchBar from '../components/history/SearchBar';
import db from '../db/database';

const HistoryPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthData, setMonthData] = useState({});
  const [dayRecords, setDayRecords] = useState({ ergo: [], strength: [], nutrition: [], bodyWeight: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const formatDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    fetchMonthData(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    fetchDayRecords(selectedDate, searchQuery, activeFilter);
  }, [selectedDate, searchQuery, activeFilter]);

  const fetchMonthData = async (monthDate) => {
    try {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const startDateStr = formatDateStr(new Date(year, month, 1));
      const endDateStr = formatDateStr(new Date(year, month + 1, 0));

      const [ergo, strength, nutrition] = await Promise.all([
        db.ergoRecords.where('date').between(startDateStr, endDateStr, true, true).toArray(),
        db.strengthRecords.where('date').between(startDateStr, endDateStr, true, true).toArray(),
        db.nutritionRecords.where('date').between(startDateStr, endDateStr, true, true).toArray()
      ]);

      const newData = {};
      
      const addToData = (records, type) => {
        records.forEach(r => {
          if (!newData[r.date]) newData[r.date] = {};
          newData[r.date][type] = true;
        });
      };

      addToData(ergo, 'ergo');
      addToData(strength, 'strength');
      addToData(nutrition, 'nutrition');

      setMonthData(newData);
    } catch (error) {
      console.error("Error fetching month data:", error);
    }
  };

  const fetchDayRecords = async (date, query, filter) => {
    try {
      const dateStr = formatDateStr(date);
      let ergo = [];
      let strength = [];
      let nutrition = [];
      let bodyWeight = [];

      if (filter === 'all' || filter === 'ergo') {
        ergo = await db.ergoRecords.where('date').equals(dateStr).toArray();
      }
      if (filter === 'all' || filter === 'strength') {
        strength = await db.strengthRecords.where('date').equals(dateStr).toArray();
      }
      if (filter === 'all' || filter === 'nutrition') {
        nutrition = await db.nutritionRecords.where('date').equals(dateStr).toArray();
      }
      if (filter === 'all') {
        bodyWeight = await db.bodyWeightRecords.where('date').equals(dateStr).toArray();
      }

      // Simple client-side search filtering
      if (query.trim()) {
        const q = query.toLowerCase();
        ergo = ergo.filter(r => r.memo?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q));
        strength = strength.filter(r => r.memo?.toLowerCase().includes(q)); // exerciseId mapping requires master data, simplified here
        nutrition = nutrition.filter(r => r.memo?.toLowerCase().includes(q) || r.mealType?.toLowerCase().includes(q));
      }

      setDayRecords({ ergo, strength, nutrition, bodyWeight });
    } catch (error) {
      console.error("Error fetching day records:", error);
    }
  };

  return (
    <div className="history-page" style={{ padding: '1rem', paddingBottom: '5rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '1.5rem' }}>履歴</h2>
      
      <SearchBar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <CalendarView 
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        monthData={monthData}
      />

      <DayDetail 
        date={selectedDate}
        records={dayRecords}
      />
    </div>
  );
};

export default HistoryPage;
