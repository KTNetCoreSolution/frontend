export function convertOrgInfoToHierarchy(orgInfoData) {
  // Create a map for quick lookup by ORGCD
  const orgMap = new Map();
  orgInfoData.forEach(org => {
    orgMap.set(org.ORGCD, { ...org, _children: [] });
  });

  // Root nodes will be stored here
  const root = [];

  // Build the hierarchy
  orgInfoData.forEach(org => {
    if (org.UPPERORGCD === '000000' || !orgMap.has(org.UPPERORGCD)) {
      // If UPPERORGCD is '000000' or parent not found, it's a root node
      root.push(orgMap.get(org.ORGCD));
    } else {
      // Add current org as a child of its parent
      const parent = orgMap.get(org.UPPERORGCD);
      if (parent) {
        parent._children.push(orgMap.get(org.ORGCD));
      }
    }
  });

  // Sort children by ORGCD for consistency
  orgMap.forEach(org => {
    org._children.sort((a, b) => a.ORGCD.localeCompare(b.ORGCD));
  });

  // Remove empty _children arrays
  orgMap.forEach(org => {
    if (org._children.length === 0) {
      delete org._children;
    }
  });

  return root;
}