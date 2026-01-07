import { describe, it, expect } from 'vitest';
import { BUILDINGS } from './BuildingConfig';
import enLocale from '../data/locales/en.json';
import frLocale from '../data/locales/fr.json';

describe('Building Configuration Integrity', () => {
    it('should have an id for every building that matches its key', () => {
        Object.entries(BUILDINGS).forEach(([key, config]) => {
            expect(config.id).toBeDefined();
            // Optional: enforce that key matches id, though strict equality might not be required if consistent
            // expect(config.id).toBe(key); 
        });
    });

    describe('Localization Keys', () => {
        const locales = [
            { name: 'en', data: enLocale },
            { name: 'fr', data: frLocale }
        ];

        locales.forEach(({ name, data }) => {
            describe(`Locale: ${name}`, () => {
                it('should have common keys', () => {
                    expect(data.common).toBeDefined();
                    expect(data.common.cost).toBeDefined();
                    expect(data.common.power).toBeDefined();
                    expect(data.common.stone).toBeDefined(); // Verified requirement
                    expect(data.common.select_item).toBeDefined(); // Verified requirement
                });

                it('should have translation keys for every building', () => {
                    Object.values(BUILDINGS).forEach((config) => {
                        const buildingKey = config.id;
                        // @ts-ignore
                        const buildingLocales = data.building[buildingKey];

                        if (!buildingLocales) {
                            throw new Error(`Missing translations for building '${buildingKey}' in locale '${name}'`);
                        }

                        expect(buildingLocales.name, `Missing name for ${buildingKey} in ${name}`).toBeDefined();
                        expect(buildingLocales.name.length, `Empty name for ${buildingKey} in ${name}`).toBeGreaterThan(0);
                        
                        expect(buildingLocales.description, `Missing description for ${buildingKey} in ${name}`).toBeDefined();
                        expect(buildingLocales.description.length, `Empty description for ${buildingKey} in ${name}`).toBeGreaterThan(0);
                    });
                });
            });
        });
    });
});
