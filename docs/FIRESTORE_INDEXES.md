# Firestore Performance Indexes

## Overview
This file configures composite indexes for Firestore to optimize query performance.

## Indexes Created

### 1. Status + CreatedAt
**Query:** List reports by status, sorted by creation date
```typescript
.where('status', '==', 'draft')
.orderBy('createdAt', 'desc')
```
**Use Case:** Report list page with status filter

---

### 2. AssignedAppraiserId + Status
**Query:** User's reports filtered by status
```typescript
.where('assignedAppraiserId', '==', userId)
.where('status', '==', 'draft')
```
**Use Case:** User dashboard showing their reports

---

### 3. AssignedAppraiserId + CreatedAt
**Query:** User's reports sorted by date
```typescript
.where('assignedAppraiserId', '==', userId)
.orderBy('createdAt', 'desc')
```
**Use Case:** User's report history

---

### 4. Status + UpdatedAt
**Query:** Recently updated reports by status
```typescript
.where('status', '==', 'for_review')
.orderBy('updatedAt', 'desc')
```
**Use Case:** Review queue

---

### 5. Report Number (Single Field)
**Query:** Search by report number
```typescript
.where('generalInfo.reportNumber', '==', 'SIPA-2024-0001')
```
**Use Case:** Quick report lookup

---

### 6. Customer Name (Single Field)
**Query:** Search by customer name
```typescript
.where('generalInfo.customerName', '==', 'John Doe')
```
**Use Case:** Customer report search

---

## Deployment

### Option 1: Firebase CLI (Recommended)
```bash
firebase deploy --only firestore:indexes
```

### Option 2: Firebase Console
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Go to Indexes tab
4. Create indexes manually based on this configuration

---

## Performance Impact

**Before:** Queries may be slow or fail with "requires an index" error
**After:** All common queries will be fast (< 100ms typically)

**Estimated improvement:** 10-50x faster for filtered/sorted queries

---

## Monitoring

After deployment, monitor query performance in Firebase Console:
- Firestore → Usage tab
- Check for any missing index warnings
- Monitor query latency metrics

---

## Notes

- Indexes are built asynchronously after deployment
- Large collections may take time to index
- Single-field indexes are created automatically
- Composite indexes must be explicitly defined
