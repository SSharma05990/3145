# Kitchen Stockflow

Simple restaurant inventory-management platform prototype built as a self-contained web app.

## What it includes

- On-hand inventory, ideal counts, and reorder quantities
- Large seeded catalog support with 2,400 demo items
- CSV bulk import for feeding in thousands of real kitchen items
- Quick-add product form inside the master inventory screen
- Product labeling by counted item, packet, weight, or box
- Optional weight-per-box and pieces-per-box fields for boxed inventory
- Tablet-friendly employee screen for fast consumption entry
- Finished-product wastage tracking with daily waste cost reporting
- Fractional box tally support for quick `1/4`, `1/3`, and `1/2` box estimates
- Daily spend view showing items used, waste, and total cost impact
- Local browser persistence with `localStorage`

## Run it

Open `index.html` in a browser.

## CSV format

Use this header:

```csv
name,category,unit,unitType,price,onHand,ideal,weightPerBox,piecesPerBox,isFinishedProduct,isBoxTracked
```

Example:

```csv
Chicken Breast,Protein,kg,weight,12.5,18,26,0,0,false,false
Tomato Sauce,Dry Storage,can,unit,4.1,22,30,0,0,false,false
Veg Manchurian,Frozen,box,box,42,8,5,4.5,100,true,true
```
