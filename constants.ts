import { GrantApplication, Outcome } from './types';

export const DEMO_GRANTS: GrantApplication[] = [
  {
    id: '1',
    title: 'Community Garden Initiative',
    outcome: Outcome.WON,
    organization: 'Green Earth Co.',
    amountRequested: 50000,
    amountAwarded: 50000,
    locations: ['TOSA SLC', 'TOSV SLC'],
    content: `Project Abstract: Green Earth Co. proposes the "Urban Roots" initiative to transform three vacant lots in the downtown district into sustainable community gardens. 
    
    Impact: This project directly addresses food insecurity by providing free organic produce to 200+ low-income families annually.
    
    Sustainability: We have secured a 5-year land use agreement with the city and partnered with local schools for ongoing maintenance, ensuring long-term viability beyond the grant period.
    
    Budget: 85% of funds go directly to materials and seeds, with 15% for educational workshops.`
  },
  {
    id: '2',
    title: 'Tech for Seniors',
    outcome: Outcome.LOST,
    organization: 'Silver Surfers NGO',
    amountRequested: 75000,
    amountAwarded: 0,
    locations: ['TOSA Denver'],
    content: `We want to buy iPads for seniors in the nursing home. It is important because technology is the future.
    
    Plan: Buy 100 iPads. Give them to the nursing home staff to distribute.
    
    Budget: $75,000 for hardware.
    
    Goals: Make seniors happy and connected.`
  },
  {
    id: '3',
    title: 'Youth Coding Bootcamp',
    outcome: Outcome.WON,
    organization: 'CodeFuture',
    amountRequested: 120000,
    amountAwarded: 100000, // Partial funding example
    locations: ['TOSA SLC', 'TOSA Denver'],
    content: `The CodeFuture Bootcamp is a proven 12-week curriculum designed to equip at-risk youth with full-stack development skills.
    
    Outcomes: In our pilot program, 80% of graduates secured internships within 3 months. This grant will scale the program to serve 50 additional students.
    
    Metrics: We track job placement, starting salary, and long-term retention. 
    
    Partnerships: Secured hiring commitments from 3 local tech firms.`
  },
  {
    id: '4',
    title: 'Art Awareness Campaign',
    outcome: Outcome.LOST,
    organization: 'ArtForAll',
    amountRequested: 20000,
    amountAwarded: 0,
    locations: ['TOSV SLC'],
    content: `We need funding to raise awareness about art. Art is beautiful and everyone should see it. We plan to print flyers and put them around town.
    
    Budget: Mostly for printing and some for snacks at meetings.
    
    Impact: People will see the flyers and think about art more.`
  }
];
