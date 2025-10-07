import React, { useState } from 'react'
import ActivityPanel from './ActivityPanel'
import CareerPanel from './CareerPanel'
import styles from './ActivityPanel.module.css'

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('activity')

  return (
    <div className={styles.AdminPanel}>
      <div className={styles.adminHeader}>
        <h1>Admin Panel</h1>
        <div className={styles.adminTabs}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'activity' ? styles.active : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity Management
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'career' ? styles.active : ''}`}
            onClick={() => setActiveTab('career')}
          >
            Career Management
          </button>
        </div>
      </div>

      <div className={styles.adminContent}>
        {activeTab === 'activity' && <ActivityPanel />}
        {activeTab === 'career' && <CareerPanel />}
      </div>
    </div>
  )
}

export default AdminPanel