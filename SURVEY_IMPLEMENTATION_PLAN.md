# Survey Frontend Implementation Plan
## Visual Replication of Approved Flow

### Overview
Complete implementation to match the approved survey flow screenshots exactly. The flow includes a giveaway landing page, 3-step survey process, and exit URL offers system.

---

## FLOW STRUCTURE

### Complete User Journey
```
Landing Page → Giveaway Display → Registration (1/3) → Survey Questions (2/3) → Offers Display (3/3) → Exit URL Offers
```

### Visual Design Requirements

#### Color Palette (Exact Match)
- **Primary Teal**: `#4ECDC4` / `hsl(174, 58%, 58%)`
- **Background**: Light mint `#B8E6E1` / `hsl(174, 35%, 85%)`
- **Cards**: Pure white `#FFFFFF`
- **Progress Bar**: Teal gradient
- **Text**: Dark gray `#333333`
- **Secondary Blue**: `#4A90E2` (for special offers)
- **Purple Gradient**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`

#### Typography
- **Font Family**: Sans-serif (Inter or similar)
- **Headers**: Bold, 18-20px
- **Body**: Medium, 14-16px
- **Buttons**: Bold, 16px

---

## DATABASE SCHEMA UPDATES

### 1. Giveaway Management Table
```sql
CREATE TABLE giveaways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL DEFAULT 'Free Product Giveaway',
  image_url VARCHAR(500) NOT NULL,
  retail_value DECIMAL(10,2) NOT NULL DEFAULT 29.99,
  shipping_value DECIMAL(10,2) DEFAULT 15.00,
  countdown_hours INTEGER DEFAULT 8,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Update Offers Table
```sql
ALTER TABLE offers ADD COLUMN offer_type VARCHAR(50) DEFAULT 'main';
-- Values: 'main', 'exit', 'giveaway'
```

### 3. Survey Questions Enhancement
```sql
ALTER TABLE questions ADD COLUMN step_number INTEGER DEFAULT 2;
ALTER TABLE questions ADD COLUMN question_category VARCHAR(100);
-- Categories: 'demographic', 'lead_gen', 'qualifying'
```

---

## COMPONENT IMPLEMENTATION

### 1. Giveaway Landing Page (`/giveaway`)

#### Layout Structure
```jsx
<div className="min-h-screen bg-mint-light">
  <header className="bg-teal-primary text-white">
    <div className="flex justify-between items-center px-6 py-4">
      <img src="@assets/brand-logo.png" alt="Free Finds" className="h-12" />
      <div className="text-center">
        <h1 className="text-xl font-bold">Free Product Giveaway</h1>
        <p className="text-sm">Claim Your Free Item Today</p>
      </div>
      <div className="bg-green-500 px-3 py-1 rounded-full text-sm">
        🎁 Limited Supply
      </div>
    </div>
  </header>
  
  <main className="flex justify-center py-8">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
      {/* Countdown Timer */}
      <div className="text-center mb-6">
        <p className="text-gray-600 mb-2">⏰ Time Remaining</p>
        <div className="bg-teal-primary text-white py-3 px-6 rounded-lg text-2xl font-bold">
          {countdownDisplay}
        </div>
      </div>
      
      {/* Cart Summary */}
      <div className="flex items-center mb-4">
        <div className="bg-teal-primary text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">
          ✓
        </div>
        <h2 className="text-lg font-bold">Cart Summary</h2>
      </div>
      
      <div className="flex items-center mb-6">
        <div className="flex-1">
          <p className="text-gray-600">Product Cost</p>
          <p className="text-xl font-bold">$0.00</p>
        </div>
        <div className="w-20 h-20 relative">
          <img src="@assets/pink-slides.png" alt="Pink Slides" className="w-full h-full object-cover rounded" />
          <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm absolute -top-2 -right-2">
            ✓
          </div>
        </div>
      </div>
      
      <p className="text-xs text-gray-500 text-center mb-4">*Representative image only</p>
      
      {/* Shipping Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Shipping</span>
          <div className="text-right">
            <p className="text-green-600 font-bold">FREE</p>
            <p className="text-xs text-green-600">You save $15.00</p>
          </div>
        </div>
      </div>
      
      {/* Total */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">Total Cost</span>
          <span className="text-2xl font-bold text-teal-primary">$0.00</span>
        </div>
      </div>
      
      <button 
        onClick={() => navigate('/register')}
        className="w-full bg-teal-primary text-white py-3 rounded-lg font-bold text-lg mt-6 hover:bg-teal-600 transition-colors"
        data-testid="button-continue-giveaway"
      >
        Continue to Claim
      </button>
    </div>
  </main>
  
  <footer className="text-center py-4 text-gray-500 text-sm">
    Limited To One Per Household
  </footer>
</div>
```

### 2. Updated Progress Bar Component
```jsx
interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export function ProgressBar({ current, total, className = "" }: ProgressBarProps) {
  const progressPercentage = (current / total) * 100;
  
  return (
    <div className={`mb-6 ${className}`} data-testid="progress-bar">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600">Step: {current}/{total}</span>
        <div className="bg-teal-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">
          {current === total ? '✓' : current}
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-teal-primary h-2 rounded-full transition-all duration-300" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  );
}
```

### 3. Countdown Timer Component
```jsx
interface CountdownTimerProps {
  initialHours?: number;
  className?: string;
}

export function CountdownTimer({ initialHours = 7, className = "" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: initialHours,
    minutes: 10,
    seconds: 20
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className={`bg-teal-primary text-white py-3 px-6 rounded-lg text-2xl font-bold text-center ${className}`} data-testid="countdown-timer">
      {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
    </div>
  );
}
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Setup & Assets ✓
- [x] Create implementation plan
- [x] Save brand logo and product images
- [ ] Update CSS color variables
- [ ] Create countdown timer component

### Phase 2: Database Schema
- [ ] Create giveaways table
- [ ] Update offers table with offer_type
- [ ] Update questions table with step_number
- [ ] Run database migration

### Phase 3: Core Components
- [ ] Create GiveawayLanding page
- [ ] Update ProgressBar component  
- [ ] Create CountdownTimer component
- [ ] Update Registration form styling
- [ ] Create Survey question templates

### Phase 4: Admin Interface
- [ ] Add giveaway management to brands section
- [ ] Image upload functionality
- [ ] Giveaway settings form
- [ ] Active/inactive toggle

### Phase 5: Survey Flow
- [ ] Update routing for new flow
- [ ] Implement survey questions (Step 2)
- [ ] Create offers display (Step 3)
- [ ] Build exit URL system
- [ ] Data persistence between steps

### Phase 6: Styling & Polish
- [ ] Exact color matching
- [ ] Button and card styling
- [ ] Mobile responsiveness
- [ ] Smooth transitions

### Phase 7: Testing
- [ ] Complete flow testing
- [ ] Visual comparison with screenshots
- [ ] Admin interface testing
- [ ] Mobile device testing

---

## SUCCESS CRITERIA

✅ **Visual Match**: 99% identical to approved screenshots
✅ **Functionality**: Complete survey flow with data persistence  
✅ **Admin Control**: Easy giveaway management interface
✅ **Mobile Ready**: Responsive design matching mobile screenshots
✅ **Performance**: Fast loading and smooth transitions

---

*This plan ensures pixel-perfect replication of the approved survey flow with complete backend integration.*