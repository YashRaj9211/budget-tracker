import { describe, it, expect } from 'vitest';
import { getCategoryVisual, suggestCategoryFromText } from './indianCategoryIcons';

describe('indianCategoryIcons', () => {
	it('detects chai, tapri, and coffee with Coffee icon', () => {
		expect(getCategoryVisual({ description: 'Evening chai at tapri' }).iconName).toBe('Coffee');
		expect(getCategoryVisual({ description: 'Filter coffee and bun' }).iconName).toBe('Coffee');
		expect(getCategoryVisual({ description: 'Kadak chai' }).iconName).toBe('Coffee');
		expect(getCategoryVisual({ description: 'Lassi and chaas' }).iconName).toBe('Coffee');
	});

	it('detects Indian street food and snacks with Utensils icon', () => {
		expect(getCategoryVisual({ description: 'Samosa and kachori' }).iconName).toBe('Utensils');
		expect(getCategoryVisual({ description: 'Vada pav at station' }).iconName).toBe('Utensils');
		expect(getCategoryVisual({ description: 'Pav bhaji' }).iconName).toBe('Utensils');
		expect(getCategoryVisual({ description: 'Golgappe in evening' }).iconName).toBe('Utensils');
		expect(getCategoryVisual({ description: 'Masala dosa and idli' }).iconName).toBe('Utensils');
		expect(getCategoryVisual({ description: 'Poha and jalebi' }).iconName).toBe('Utensils');
		expect(getCategoryVisual({ description: 'Chole bhature' }).iconName).toBe('Utensils');
		expect(getCategoryVisual({ description: 'Maggi at hills' }).iconName).toBe('Utensils');
	});

	it('detects Indian meals, curries and delivery', () => {
		expect(getCategoryVisual({ description: 'Hyderabadi biryani' }).iconName).toBe('Utensils');
		expect(getCategoryVisual({ description: 'Dal makhani & naan' }).iconName).toBe('Utensils');
		expect(getCategoryVisual({ description: 'Dinner at dhaba' }).iconName).toBe('Utensils');
		expect(getCategoryVisual({ description: 'Swiggy order' }).iconName).toBe('Utensils');
		expect(getCategoryVisual({ description: 'Zomato lunch' }).iconName).toBe('Utensils');
		expect(getCategoryVisual({ description: 'Monthly tiffin mess' }).iconName).toBe('Utensils');
	});

	it('detects groceries, kirana, and quick commerce apps with ShoppingCart icon', () => {
		expect(getCategoryVisual({ description: 'Blinkit order' }).iconName).toBe('ShoppingCart');
		expect(getCategoryVisual({ description: 'Zepto munchies' }).iconName).toBe('ShoppingCart');
		expect(getCategoryVisual({ description: 'Instamart delivery' }).iconName).toBe('ShoppingCart');
		expect(getCategoryVisual({ description: 'Kirana dukan rashan' }).iconName).toBe('ShoppingCart');
		expect(getCategoryVisual({ description: 'Subzi mandi - aloo pyaz' }).iconName).toBe('ShoppingCart');
		expect(getCategoryVisual({ description: 'Amul doodh and dahi' }).iconName).toBe('ShoppingCart');
		expect(getCategoryVisual({ description: 'Aashirvaad atta 10kg' }).iconName).toBe('ShoppingCart');
	});

	it('detects Indian transit: auto, rapido, metro, and local train', () => {
		expect(getCategoryVisual({ description: 'Auto fare to office' }).iconName).toBe('Car');
		expect(getCategoryVisual({ description: 'Rapido bike ride' }).iconName).toBe('Car');
		expect(getCategoryVisual({ description: 'Ola cab to airport' }).iconName).toBe('Car');
		expect(getCategoryVisual({ description: 'Metro recharge' }).iconName).toBe('Train');
		expect(getCategoryVisual({ description: 'Local train ticket' }).iconName).toBe('Train');
		expect(getCategoryVisual({ description: 'IRCTC tatkal ticket' }).iconName).toBe('Train');
	});

	it('detects fuel (petrol, diesel, CNG)', () => {
		expect(getCategoryVisual({ description: 'Petrol 500 rs' }).iconName).toBe('Fuel');
		expect(getCategoryVisual({ description: 'Diesel refill at IOCL' }).iconName).toBe('Fuel');
		expect(getCategoryVisual({ description: 'CNG filling' }).iconName).toBe('Fuel');
	});

	it('detects medicines and healthcare with HeartPulse icon', () => {
		expect(getCategoryVisual({ description: 'Dolo 650' }).iconName).toBe('HeartPulse');
		expect(getCategoryVisual({ description: 'Paracetamol and cough syrup' }).iconName).toBe('HeartPulse');
		expect(getCategoryVisual({ description: 'Apollo pharmacy dawa' }).iconName).toBe('HeartPulse');
		expect(getCategoryVisual({ description: 'Doctor consultation fee' }).iconName).toBe('HeartPulse');
		expect(getCategoryVisual({ description: 'Blood test at Lal Pathlabs' }).iconName).toBe('HeartPulse');
	});

	it('detects utility bills: bijli, gas cylinder, recharge, and rent', () => {
		expect(getCategoryVisual({ description: 'Bijli bill' }).iconName).toBe('Zap');
		expect(getCategoryVisual({ description: 'LPG cylinder booking' }).iconName).toBe('Zap');
		expect(getCategoryVisual({ description: 'Jio mobile recharge' }).iconName).toBe('Smartphone');
		expect(getCategoryVisual({ description: 'Wifi broadband bill' }).iconName).toBe('Smartphone');
		expect(getCategoryVisual({ description: 'Flat rent / ghar ka kiraya' }).iconName).toBe('Home');
		expect(getCategoryVisual({ description: 'Water tanker' }).iconName).toBe('Receipt');
	});

	it('detects clothing, ethnic wear, and salon', () => {
		expect(getCategoryVisual({ description: 'Kurta and saree shopping' }).iconName).toBe('ShoppingBag');
		expect(getCategoryVisual({ description: 'Myntra parcel' }).iconName).toBe('ShoppingBag');
		expect(getCategoryVisual({ description: 'Darzi stitching fee' }).iconName).toBe('ShoppingBag');
		expect(getCategoryVisual({ description: 'Barber haircut and shaving' }).iconName).toBe('Sparkles');
		expect(getCategoryVisual({ description: 'Beauty parlour mehendi' }).iconName).toBe('Sparkles');
	});

	it('detects puja, temple, shagun, and investments', () => {
		expect(getCategoryVisual({ description: 'Mandir prasad and diya' }).iconName).toBe('Flame');
		expect(getCategoryVisual({ description: 'Shagun lifafa for shaadi' }).iconName).toBe('Gift');
		expect(getCategoryVisual({ description: 'Zerodha SIP mutual fund' }).iconName).toBe('Landmark');
		expect(getCategoryVisual({ description: 'Gold coin for diwali' }).iconName).toBe('Landmark');
	});

	it('correctly suggests categories from text', () => {
		expect(suggestCategoryFromText('Samosa')).toBe('Food');
		expect(suggestCategoryFromText('Auto rickshaw')).toBe('Travel');
		expect(suggestCategoryFromText('Blinkit grocery')).toBe('Groceries');
		expect(suggestCategoryFromText('Bijli bill')).toBe('Bills');
		expect(suggestCategoryFromText('Dolo medicine')).toBe('Health');
	});
});
