import DailyBudgetCard from '../components/budget/DailyBudgetCard';
import Button from '../components/common/Button';
import TransactionList from '../components/transaction/TransactionList';
import HomePageHeader from '../components/home/HomeHeader';
import AddTransactionForm from '../components/transaction/AddTransactionForm';

function Home() {
	return (
		<div className="relative">
			<HomePageHeader />
			<div>
				<div>
					<div className="flex items-center justify-between gap-4 my-2">
						<Button text="Daily" type="primary" className="flex-1" />
						<Button text="Monthly" type="secondary" className="flex-1" />
						<Button text="Calender" type="secondary" className="flex-1" />
					</div>
				</div>
				<DailyBudgetCard />
				<div className='border'>
					{/* List of transactions */}
					<TransactionList />
					<TransactionList />
					<TransactionList />
				</div>
			</div>
			{/* Expanding Add Transaction Form and FAB */}
			<AddTransactionForm />
		</div>
	);
}

export default Home;
