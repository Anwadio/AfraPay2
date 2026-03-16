# Accessibility & Internationalization Implementation Guide

## Quick Start

The Afra-pay frontend now includes comprehensive accessibility and internationalization support. Here's how to use the new features in your components.

## Translation System

### Basic Usage

```javascript
import { useTranslation } from "../utils/accessibility";

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("dashboard.title")}</h1>
      <p>{t("common.loading")}</p>
    </div>
  );
}
```

### With Variables

```javascript
const { t } = useTranslation();

// Use interpolation
const welcomeMessage = t("dashboard.welcome", { name: user.name });
// Output: "Welcome back, John"
```

### Formatting Functions

```javascript
const { formatCurrency, formatDate, formatNumber } = useTranslation();

// Format currency
const price = formatCurrency(1500, "USD"); // $1,500.00

// Format dates
const date = formatDate(new Date(), {
  year: "numeric",
  month: "long",
  day: "numeric",
});

// Format numbers
const amount = formatNumber(1500.5); // 1,500.5
```

## Accessible Components

### Using Accessible Buttons

```javascript
import { Button } from "../components/ui/Button";

function ActionButton() {
  return (
    <Button
      variant="primary"
      aria-label="Save your changes"
      aria-describedby="save-help"
      loading={isLoading}
      onClick={handleSave}
    >
      Save
    </Button>
  );
}
```

### Using Accessible Forms

```javascript
import { FormField, Input } from "../components/ui/Input";

function ContactForm() {
  const { t } = useTranslation();

  return (
    <form>
      <FormField
        label={t("auth.email")}
        error={emailError}
        helpText={t("auth.emailHelp")}
        required
      >
        <Input
          type="email"
          aria-required="true"
          placeholder={t("auth.emailPlaceholder")}
          value={email}
          onChange={setEmail}
        />
      </FormField>
    </form>
  );
}
```

## Accessibility Utilities

### Focus Traps (for Modals)

```javascript
import { useFocusTrap } from "../utils/accessibility";

function Modal({ isOpen, onClose }) {
  const focusTrapRef = useFocusTrap(isOpen);

  return (
    <div
      ref={focusTrapRef}
      role="dialog"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <h2 id="modal-title">Modal Title</h2>
      <p id="modal-description">Modal content</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

### Screen Reader Announcements

```javascript
import { announceToScreenReader } from "../utils/accessibility";

function DataTable() {
  const handleSort = () => {
    // Sort data...
    announceToScreenReader("Table sorted by name, ascending");
  };

  const handleFilter = () => {
    // Apply filters...
    announceToScreenReader("5 results found");
  };
}
```

### Keyboard Navigation

```javascript
import { useKeyboardNavigation } from "../utils/accessibility";

function SearchResults({ items, onSelect }) {
  const { focusedIndex, handleKeyDown } = useKeyboardNavigation(
    items,
    onSelect
  );

  return (
    <ul role="listbox" onKeyDown={handleKeyDown}>
      {items.map((item, index) => (
        <li
          key={item.id}
          role="option"
          aria-selected={index === focusedIndex}
          className={index === focusedIndex ? "bg-blue-100" : ""}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

## Skip Links

Already implemented in `DashboardLayout`. To add more skip links:

```javascript
import { SkipLinks } from "../utils/accessibility";

const skipLinks = [
  { href: "#main-content", text: "Skip to main content" },
  { href: "#navigation", text: "Skip to navigation" },
  { href: "#search", text: "Skip to search" },
];

<SkipLinks links={skipLinks} />;
```

## Language Support

### Adding New Translations

Edit `src/translations/translations.json`:

```json
{
  "en": {
    "myFeature": {
      "title": "My Feature",
      "description": "This is my feature"
    }
  },
  "es": {
    "myFeature": {
      "title": "Mi Función",
      "description": "Esta es mi función"
    }
  }
}
```

### RTL Language Support

The system automatically handles RTL for Arabic, Hebrew, Persian, and Urdu:

```javascript
// This will automatically set dir="rtl" for RTL languages
const { direction } = useTranslation();

// Use in CSS
<div className={`flex ${direction === 'rtl' ? 'flex-row-reverse' : 'flex-row'}`}>
```

## ARIA Best Practices

### Landmark Roles

```javascript
<nav role="navigation" aria-label="Main navigation">
<main role="main" id="main-content">
<aside role="complementary" aria-label="Sidebar">
<footer role="contentinfo">
```

### Live Regions

```javascript
<div aria-live="polite" id="status-updates">
  {statusMessage}
</div>

<div aria-live="assertive" id="error-messages">
  {errorMessage}
</div>
```

### Form Accessibility

```javascript
<label htmlFor="username">Username *</label>
<input
  id="username"
  type="text"
  aria-required="true"
  aria-describedby="username-error username-help"
  aria-invalid={hasError}
/>
<div id="username-help">Enter your username</div>
{hasError && (
  <div id="username-error" role="alert">
    Username is required
  </div>
)}
```

## Testing Accessibility

### Manual Testing Checklist

- [ ] Tab through all interactive elements
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Test keyboard-only navigation
- [ ] Test high contrast mode
- [ ] Test zoom up to 200%

### Automated Testing

```javascript
// Install testing tools
npm install --save-dev @axe-core/react eslint-plugin-jsx-a11y

// In your tests
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('should not have accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Common Patterns

### Loading States

```javascript
<Button loading={isLoading} aria-label="Save changes">
  {isLoading ? 'Saving...' : 'Save'}
</Button>

<div aria-live="polite">
  {isLoading && 'Loading data, please wait...'}
</div>
```

### Error States

```javascript
<Input
  error={!!emailError}
  aria-invalid={!!emailError}
  aria-describedby={emailError ? "email-error" : undefined}
/>;
{
  emailError && (
    <div id="email-error" role="alert" className="text-red-600">
      {emailError}
    </div>
  );
}
```

### Success Messages

```javascript
const handleSubmit = async () => {
  try {
    await submitForm();
    announceToScreenReader("Form submitted successfully");
  } catch (error) {
    announceToScreenReader("Error submitting form");
  }
};
```

## CSS Classes for Accessibility

```css
/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Show on focus (skip links) */
.sr-only.focus:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

This guide covers the main accessibility and internationalization features. For more details, see the full audit report in `ACCESSIBILITY_AUDIT.md`.
