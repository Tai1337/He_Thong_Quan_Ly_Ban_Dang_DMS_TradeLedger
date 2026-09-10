import React from 'react';
import DashboardCards from '../../components/DashboardCards';
import ExpenseForm from '../../components/ExpenseForm';
import ExpenseList from '../../components/ExpenseList';

const Dashboard = ({ expenses, onAddExpense, onDeleteExpense }) => {
  return (
    <main>
      <DashboardCards expenses={expenses} />
      <ExpenseForm onAddExpense={onAddExpense} />
      <ExpenseList expenses={expenses} onDelete={onDeleteExpense} />
    </main>
  );
};

export default Dashboard;
