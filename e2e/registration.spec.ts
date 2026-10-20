import { expect, test } from '@camphoric/camphoric-event-import-tools/e2e';

import event from '../index.ts';

// The registration form, as a registrant fills it in. Every test shares the one
// imported event (see README.md), so a completed registration stays.

test('the form opens under the event\'s name', async ({ page, registration }) => {
  await registration.open();
  await expect(page.getByRole('heading', { name: `${event.data.event.name} Registration` })).toBeVisible();
});

// The Skywalker household from testRegistrations.ts: two adults in a small RV,
// two teenagers in a tent. From the pricing table: 2 × $150 + 2 × $75.
test('a household is priced from the pricing table', async ({ registration }) => {
  await registration.open();
  await registration.fill('Registrant email', 'skywalker123456@dontsend.com');

  const campers = [
    ['Ani', 'Skywalker', '50-64 years old', 'RV under 15\' long'],
    ['Padmé', 'Amidala', '50-64 years old', 'RV under 15\' long'],
    ['Luke', 'Skywalker', '12-17 years old', 'Tent'],
    ['Leia', 'Organa', '12-17 years old', 'Tent'],
  ];
  for (const [i, [first, last, age, lodging]] of campers.entries()) {
    const camper = i === 0 ? registration.camper(1) : await registration.addCamper();
    await camper.fill('First name', first);
    await camper.fill('Last name', last);
    await camper.select('Age', age);
    await camper.chooseLodging(lodging);
  }

  await registration.expectTotal(450);
});

test('lodging offers the kinds of camping', async ({ registration }) => {
  await registration.open();
  const [choices] = await registration.camper(1).chooseLodging('Tent');
  // (in alphabetical order)
  expect(choices).toEqual([
    'Off Site - Full Camp',
    'Off Site - Single Day',
    'Premium Suite (must be double occupancy)',
    'Private Room',
    'RV 15\'-20\' long',
    'RV under 15\' long',
    'Shared Room',
    'Tent',
  ]);
});

// The spots under each kind (CS 3 Spot A, Lg RV 1, FH Cypress, …) are assigned
// by the camp, not chosen: choosing a kind opens no dropdown below it.
test('a kind of camping offers no individual spots to choose', async ({ registration }) => {
  await registration.open();
  const camper = registration.camper(1);
  const [kinds] = await camper.chooseLodging('Tent');
  for (const kind of kinds) {
    await camper.chooseLodging(kind);
    await expect(camper.lodgingLevels(), kind).toHaveCount(1);
  }
});

test('a registration missing required answers isn\'t submitted', async ({ page, registration }) => {
  await registration.open();
  await registration.submit();
  await expect(registration.camper(1).field('First name')).toHaveJSProperty('validity.valueMissing', true);
  await expect(page).toHaveURL(/\/register\/registration$/);
});

test('a registration goes through, paying by check', async ({ page, registration }) => {
  await registration.open();
  await registration.fill('Registrant email', 'bobross123456@dontsend.com');
  const camper = registration.camper(1);
  await camper.fill('First name', 'Bob');
  await camper.fill('Last name', 'Ross');
  // (Required, though not marked with an asterisk)
  await camper.fill('Camper Email', 'bobross123456@dontsend.com');
  await camper.fill('Phone Number', '+1 555 123 5678');
  await camper.chooseLodging('Tent');
  await camper.select('Chore signup', 'Cleanup');
  await registration.expectTotal(150);

  await registration.submit();
  await registration.expectPaymentStep();
  await registration.payByCheck();
  await expect(page).toHaveURL(/\/register\/finished$/);
});

// Next, the behaviour particular to this camp:
test.fixme('a premium suite is booked with two or more people', () => {});
test.fixme('"Off Site - Single Day" is priced per day attended', () => {});
test.fixme('a donation is added to the total', () => {});
test.fixme('the chore signup offers each shift', () => {});
