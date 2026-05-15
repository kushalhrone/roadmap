export interface Feature {
  id: number;
  text: string;
  tags: string[];
  votes: number;
  date: string;
  module: string;
  reqfor: string;
  priority: string;
  reqtype: string;
  created: string;
  release: string;
  releasedOn?: string;
  hot?: boolean;
}

export interface FeaturesData {
  planned: Feature[];
  indev: Feature[];
  released: Feature[];
}

export const FEATURES: FeaturesData = {
  planned: [
    { id: 1, text: 'As an employee, I should be able to import expense receipts.', tags: ['HR','Expense','Customer'], votes: 5, date: '07/02/2022', module:'Core', reqfor:'CXO', priority:'High', reqtype:'Customer', created:'07/01/2023', release:'07/04/2023' },
    { id: 2, text: 'As an employee, I should be able to import expense receipts.', tags: ['CXO','Expense','Internal'], votes: 11, date: '07/02/2022', module:'Core', reqfor:'CXO', priority:'Medium', reqtype:'Internal', created:'06/15/2023', release:'08/01/2023' },
    { id: 3, text: 'As an employee, I should be able to import expense receipts.', tags: ['HR','Expense','Customer'], votes: 5, date: '07/02/2022', module:'HR', reqfor:'HR', priority:'Low', reqtype:'Customer', created:'05/20/2023', release:'09/01/2023' },
    { id: 4, text: 'As a manager, I should be able to view team attendance at a glance.', tags: ['HR','Paid feature','Customer'], votes: 8, date: '07/02/2022', module:'HR', reqfor:'Managers', priority:'High', reqtype:'Customer', created:'06/01/2023', release:'10/01/2023' },
    { id: 5, text: 'System should auto-generate payroll reports monthly.', tags: ['CXO','Expense','Recommendation'], votes: 3, date: '08/15/2022', module:'Payroll', reqfor:'Finance', priority:'Medium', reqtype:'Internal', created:'07/10/2023', release:'11/01/2023' },
  ],
  indev: [
    { id: 6, text: 'As an employee, I should be able to import expense receipts.', tags: ['HR','Expense','Internal'], votes: 8, date: '07/02/2022', module:'Core', reqfor:'HR', priority:'High', reqtype:'Internal', created:'07/01/2023', release:'07/15/2023' },
    { id: 7, text: 'As an employee, I should be able to import expense receipts.', tags: ['Expense','HR','Internal'], votes: 5, date: '07/02/2022', module:'Expense', reqfor:'Employees', priority:'Medium', reqtype:'Internal', created:'06/01/2023', release:'08/10/2023' },
    { id: 8, text: 'As an employee, I should be able to import expense receipts.', tags: ['HR','Expense','Customer'], votes: 5, date: '07/02/2022', module:'HR', reqfor:'HR', priority:'Low', reqtype:'Customer', created:'05/01/2023', release:'09/20/2023' },
    { id: 9, text: 'Automated leave balance calculation on public holidays.', tags: ['HR','Expense','Recommendation','Customer'], votes: 4, date: '07/02/2022', module:'HR', reqfor:'HR', priority:'High', reqtype:'Customer', created:'06/20/2023', release:'10/15/2023', hot: true },
  ],
  released: [
    { id: 10, text: 'As an employee, I should be able to import expense receipts.', tags: ['HR','Expense','Customer'], votes: 15, date: '07/02/2022', releasedOn:'07/02/2022', module:'Core', reqfor:'HR', priority:'High', reqtype:'Customer', created:'01/01/2023', release:'07/02/2022' },
    { id: 11, text: 'Dashboard widgets for quick HR overview.', tags: ['Expense','HR','Paid feature','Customer'], votes: 15, date: '07/02/2022', releasedOn:'07/02/2022', module:'Core', reqfor:'CXO', priority:'High', reqtype:'Customer', created:'02/01/2023', release:'07/02/2022' },
  ]
};
