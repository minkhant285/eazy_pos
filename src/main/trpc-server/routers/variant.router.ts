import { z } from "zod";
import { router, publicProcedure, mapError } from "../trpc";
import { VariantService } from "../../db/services";

export const variantRouter = router({
  // ── Attributes ─────────────────────────────────────────────

  getAttributes: publicProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return VariantService.getAttributesWithOptions(input.productId);
      } catch (err) {
        mapError(err);
      }
    }),

  createAttribute: publicProcedure
    .input(z.object({ productId: z.string().uuid(), name: z.string().min(1) }))
    .mutation(({ input }) => {
      try {
        return VariantService.createAttribute(input.productId, input.name);
      } catch (err) {
        mapError(err);
      }
    }),

  deleteAttribute: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        VariantService.deleteAttribute(input.id);
        return { success: true };
      } catch (err) {
        mapError(err);
      }
    }),

  addOption: publicProcedure
    .input(
      z.object({
        attributeId: z.string().uuid(),
        value: z.string().min(1),
        sortOrder: z.number().int().nonnegative().optional(),
      })
    )
    .mutation(({ input }) => {
      try {
        return VariantService.addOption(input.attributeId, input.value, input.sortOrder);
      } catch (err) {
        mapError(err);
      }
    }),

  removeOption: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        VariantService.removeOption(input.id);
        return { success: true };
      } catch (err) {
        mapError(err);
      }
    }),

  // ── Variants ───────────────────────────────────────────────

  generateVariants: publicProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .mutation(({ input }) => {
      try {
        return VariantService.generateVariants(input.productId);
      } catch (err) {
        mapError(err);
      }
    }),

  listVariants: publicProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return VariantService.listVariants(input.productId);
      } catch (err) {
        mapError(err);
      }
    }),

  updateVariant: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          sku: z.string().min(1).optional(),
          barcode: z.string().nullable().optional(),
          costPrice: z.number().nonnegative().optional(),
          sellingPrice: z.number().positive().optional(),
          wholesalePrice: z.number().nonnegative().nullable().optional(),
          imageUrl: z.string().nullable().optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      try {
        return VariantService.updateVariant(input.id, input.data);
      } catch (err) {
        mapError(err);
      }
    }),

  getPickerData: publicProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return VariantService.getPickerData(input.productId);
      } catch (err) {
        mapError(err);
      }
    }),

  // ── Stock ──────────────────────────────────────────────────

  /** List variants with their qty at a specific location */
  listWithStock: publicProcedure
    .input(z.object({ productId: z.string().uuid(), locationId: z.string().uuid() }))
    .query(({ input }) => {
      try {
        return VariantService.listVariantsWithStock(input.productId, input.locationId);
      } catch (err) {
        mapError(err);
      }
    }),

  setStock: publicProcedure
    .input(
      z.object({
        variantId: z.string().uuid(),
        locationId: z.string().uuid(),
        qty: z.number().nonnegative(),
      })
    )
    .mutation(({ input }) => {
      try {
        return VariantService.setVariantStockQty(input.variantId, input.locationId, input.qty);
      } catch (err) {
        mapError(err);
      }
    }),
});
