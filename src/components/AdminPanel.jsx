import React, { useState } from 'react'
import ActivityPanel from './ActivityPanel'
import CareerPanel from './CareerPanel'

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('activity')

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <div className="admin-tabs">
          <button 
            className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity Management
          </button>
          <button 
            className={`tab-button ${activeTab === 'career' ? 'active' : ''}`}
            onClick={() => setActiveTab('career')}
          >
            Career Management
          </button>
        </div>
      </div>

      <div className="admin-content">
        {activeTab === 'activity' && <ActivityPanel />}
        {activeTab === 'career' && <CareerPanel />}
      </div>

      <style jsx>{`
        .admin-panel {
          min-height: 100vh;
          background: #f5f5f5;
        }
        
        .admin-header {
          background: white;
          padding: 20px;
          border-bottom: 1px solid #ddd;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .admin-header h1 {
          margin: 0 0 20px 0;
          color: #333;
        }
        
        .admin-tabs {
          display: flex;
          gap: 10px;
        }
        
        .tab-button {
          padding: 12px 24px;
          border: 1px solid #ddd;
          background: #f8f9fa;
          cursor: pointer;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .tab-button.active {
          background: #0070f3;
          color: white;
          border-color: #0070f3;
        }
        
        .tab-button:hover {
          background: #e9ecef;
        }
        
        .tab-button.active:hover {
          background: #0056b3;
        }
        
        .admin-content {
          padding: 20px;
        }
      `}</style>
    </div>
  )
}

export default AdminPanel