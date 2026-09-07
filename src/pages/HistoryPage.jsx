import React, { useState, useEffect } from 'react';
import CalendarView from '../components/history/CalendarView';
import DayDetail from '../components/history/DayDetail';
import SearchBar from '../components/history/SearchBar';
import db from '../db/database';

const HistoryPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthData, setMonthData] = useState({});
  const [dayRecords, setDayRecords] = useState({ ergo: [], cross: [], strength: [], nutrition: [], bodyWeight: [] });
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

      const [ergo, cross, strength, nutrition] = await Promise.all([
        db.ergoRecords.where('date').between(startDateStr, endDateStr, true, true).toArray(),
        db.crossTrainingRecords ? db.crossTrainingRecords.where('date').between(startDateStr, endDateStr, true, true).toArray() : Promise.resolve([]),
        db.strengthRecords.where('date').between(startDateStr, endDateStr, true, true).toArray(),
        db.nutritionRecords.where('date').between(startDateStr, endDateStr, true, true).toArray()
      ]);

      const newData = {};
      
      // Calculate intensity score for each day
      const addIntensity = (date, points) => {
        if (!newData[date]) newData[date] = { intensity: 0, types: {} };
        newData[date].intensity += points;
      };

      ergo.forEach(r => {
        let pts = 1;
        if (r.distance) pts += Math.floor(r.distance / 5000);
        addIntensity(r.date, pts);
        newData[r.date].types['ergo'] = true;
      });

      cross.forEach(r => {
        let pts = 1;
        if (r.distance) pts += Math.floor(r.distance / 5);
        addIntensity(r.date, pts);
        newData[r.date].types['cross'] = true;
      });

      strength.forEach(r => {
        addIntensity(r.date, 1);
        newData[r.date].types['strength'] = true;
      });

      nutrition.forEach(r => {
        // Nutrition doesn't add to training intensity, just mark it
        if (!newData[r.date]) newData[r.date] = { intensity: 0, types: {} };
        newData[r.date].types['nutrition'] = true;
      });

      // Normalize intensity to 0-4 levels
      Object.keys(newData).forEach(date => {
        let score = newData[date].intensity;
        let level = 0;
        if (score > 0) level = 1;
        if (score >= 3) level = 2;
        if (score >= 6) level = 3;
        if (score >= 10) level = 4;
        newData[date].level = level;
      });

      setMonthData(newData);
    } catch (error) {
      console.error("Error fetching month data:", error);
    }
  };

  const fetchDayRecords = async (date, query, filter) => {
    try {
      const dateStr = formatDateStr(date);
      let ergo = [];
      let cross = [];
      let strength = [];
      let nutrition = [];
      let bodyWeight = [];

      if (filter === 'all' || filter === 'ergo') {
        ergo = await db.ergoRecords.where('date').equals(dateStr).toArray();
        cross = db.crossTrainingRecords ? await db.crossTrainingRecords.where('date').equals(dateStr).toArray() : [];
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
        cross = cross.filter(r => r.memo?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q));
        strength = strength.filter(r => r.memo?.toLowerCase().includes(q)); // exerciseId mapping requires master data, simplified here
        nutrition = nutrition.filter(r => r.memo?.toLowerCase().includes(q) || r.mealType?.toLowerCase().includes(q));
      }

      setDayRecords({ ergo, cross, strength, nutrition, bodyWeight });
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
        onRecordChange={() => {
          fetchMonthData(currentMonth);
          fetchDayRecords(selectedDate, searchQuery, activeFilter);
        }}
      />
    </div>
  );
};

export default HistoryPage;
