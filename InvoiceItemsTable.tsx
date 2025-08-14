import React from "react";
import {
  TextField,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Box,
  Menu,
  IconButton,
  ListItemIcon,
  ListItemText,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Tooltip,
} from "@mui/material";
import {
  Delete,
  ContentCopy,
  Add,
  Apps,
  MoreVert,
  Info,
} from "@mui/icons-material";
import { DeleteForever } from "@mui/icons-material";
import { AiOutlineImport } from "react-icons/ai";
import { CiImport } from "react-icons/ci";
import { IoMdAddCircleOutline } from "react-icons/io";
import CustomIconButton from "../../../../../../components/shared/CustomIconButton";
import {
  ServiceItem,
  INVOICE_LINE_ITEMS,
  AdvancePaymentResponse,
} from "./type";

interface InvoiceItemsTableProps {
  serviceItems: ServiceItem[];
  form: any;
  formErrors: any;
  itemMenuAnchorEl: HTMLElement | null;
  selectedItemId: string | null;
  rowsWithSections: Set<string>;
  ancillaryCharges: any[];
  importSource: boolean;
  serviceOnlyItemsCount: number;
  operatorTransactionId: string | undefined;
  id: string | undefined;
  onItemChange: (id: string, field: keyof ServiceItem, value: any) => void;
  onAddItem: (type: "service" | "category", insertBeforeId?: string, lineItemTypeValue?: string) => void;
  onDeleteItem: (id: string) => void;
  onCloneItem: (id: string) => void;
  onSectionLineItemTypeChange: (sectionId: string, newLineItemType: string) => void;
  onItemMenuAnchorElChange: (anchorEl: HTMLElement | null) => void;
  onSelectedItemIdChange: (id: string | null) => void;
  onInvoiceMenuAnchorElChange: (anchorEl: HTMLElement | null) => void;
  onAddNewAncillaryCharge: () => void;
  onImportFromPDA: () => void;
  onImportFromAdvance: () => Promise<void>;
  onClearServices: () => void;
  apiCurrencyConvertor: (payload: any) => Promise<any>;
  validateServiceItems: () => void;
  generateUniqueId: () => string;
}

const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
  serviceItems,
  form,
  formErrors,
  itemMenuAnchorEl,
  selectedItemId,
  rowsWithSections,
  ancillaryCharges,
  importSource,
  serviceOnlyItemsCount,
  operatorTransactionId,
  id,
  onItemChange,
  onAddItem,
  onDeleteItem,
  onCloneItem,
  onSectionLineItemTypeChange,
  onItemMenuAnchorElChange,
  onSelectedItemIdChange,
  onInvoiceMenuAnchorElChange,
  onAddNewAncillaryCharge,
  onImportFromPDA,
  onImportFromAdvance,
  onClearServices,
  apiCurrencyConvertor,
  validateServiceItems,
  generateUniqueId,
}) => {
  return (
    <Box>
      <Box
        sx={{
          my: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h6"
          sx={{ margin: 0, fontFamily: "Inter, sans-serif" }}
        >
          Items Table
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <CustomIconButton
            color={importSource ? "inherit" : "primary"}
            onClick={importSource ? () => {} : onImportFromPDA}
            icon={<AiOutlineImport size={18} style={{ color: '#363F72' }} />}
            tooltip="Import from PDA"
          />
          {form.invoiceType === "ADA" && (
            <CustomIconButton
              color="primary"
              onClick={onImportFromAdvance}
              icon={<CiImport size={18} style={{ color: '#363F72' }} />}
              tooltip="Import from Advance"
            />
          )}
          <CustomIconButton
            color="error"
            onClick={onClearServices}
            icon={<DeleteForever size={18} style={{ color: '#D32F2F' }} />}
            tooltip="Clear All Services"
          />
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: "semibold",
                  width: "35%",
                  fontFamily: "inter",
                }}
              >
                Service
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: "semibold",
                  width: "15%",
                  fontFamily: "inter",
                  textAlign: "center", 
                }}
              >
                Cost
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "semibold",
                  width: "8%",
                  fontFamily: "inter",
                }}
              >
                Quantity
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "semibold",
                  width: "8%",
                  fontFamily: "inter",
                }}
              >
                Discount
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "semibold",
                  width: "8%",
                  fontFamily: "inter",
                }}
              >
                Tax
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "semibold",
                  width: "18%",
                  fontFamily: "inter",
                }}
              >
                Amount
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "semibold",
                  width: "8%",
                  fontFamily: "inter",
                }}
              ></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {serviceItems?.map((item) => (
              <TableRow key={item.id} className="action-row">
                {item.type === "service" ? (
                  <>
                    <TableCell sx={{ width: "35%" }}>
                      {item.type === "service" &&
                      item.lineItemType === "INVLI002" ? (
                        <FormControl fullWidth size="small">
                          <Autocomplete
                            variant="standard"
                            key={ancillaryCharges.length}
                            value={item.description}
                            onChange={async (_, newValue) => {
                              if (newValue === "") {
                                onAddNewAncillaryCharge();
                                return;
                              }

                              const selectedCharge =
                                ancillaryCharges?.find(
                                  (charge) =>
                                    charge.ancillaryChargeName ===
                                    newValue
                                );

                              if (selectedCharge) {
                                if (
                                  selectedCharge.ancillaryChargeCurrency !==
                                  form.currencyCode
                                ) {
                                  try {
                                    const payload = {
                                      from: selectedCharge.ancillaryChargeCurrency,
                                      to: form.currencyCode,
                                      amount:
                                        selectedCharge.ancillaryChargeCost.toFixed(
                                          2
                                        ),
                                    };
                                    const response =
                                      await apiCurrencyConvertor(
                                        payload
                                      );
                                    const convertedCost = Math.round(
                                      Number(response?.data)
                                    );

                                    onItemChange(
                                      item.id,
                                      "description",
                                      `${newValue} (${selectedCharge.ancillaryChargeCurrency} ${selectedCharge.ancillaryChargeCost})`
                                    );
                                    onItemChange(
                                      item.id,
                                      "cost",
                                      convertedCost
                                    );
                                    onItemChange(
                                      item.id,
                                      "isAncillarySelected",
                                      true
                                    );
                                  } catch (error) {
                                    console.error(
                                      "Error converting currency:",
                                      error
                                    );
                                    onItemChange(
                                      item.id,
                                      "description",
                                      `${newValue} (${selectedCharge.ancillaryChargeCurrency} ${selectedCharge.ancillaryChargeCost})`
                                    );
                                    onItemChange(
                                      item.id,
                                      "cost",
                                      selectedCharge.ancillaryChargeCost
                                    );
                                    onItemChange(
                                      item.id,
                                      "isAncillarySelected",
                                      true
                                    );
                                  }
                                } else {
                                  onItemChange(
                                    item.id,
                                    "description",
                                    `${newValue} (${selectedCharge.ancillaryChargeCurrency} ${selectedCharge.ancillaryChargeCost})`
                                  );
                                  onItemChange(
                                    item.id,
                                    "cost",
                                    selectedCharge.ancillaryChargeCost
                                  );
                                  onItemChange(
                                    item.id,
                                    "isAncillarySelected",
                                    true
                                  );
                                }
                              } else {
                                onItemChange(
                                  item.id,
                                  "description",
                                  newValue || ""
                                );
                                onItemChange(
                                  item.id,
                                  "isAncillarySelected",
                                  false
                                );
                              }
                            }}
                            onInputChange={(_, newInputValue) => {
                              if (!newInputValue.includes("(")) {
                                onItemChange(
                                  item.id,
                                  "description",
                                  newInputValue
                                );
                              }
                            }}
                            freeSolo
                            options={[
                              ...ancillaryCharges.map(
                                (charge) => charge.ancillaryChargeName
                              ),
                              "add_new",
                            ]}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                variant="standard"
                                size="small"
                                placeholder="Type or select an ancillary charge"
                                sx={{
                                  maxHeight: "40px",
                                  display: "flex",
                                  alignItems: "center",
                                  fontFamily: "inter",
                                }}
                              />
                            )}
                            renderOption={(props, option) => {
                              if (option === "add_new") {
                                return (
                                  <li
                                    {...props}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAddNewAncillaryCharge();
                                    }}
                                    style={{
                                      color: "#1976d2",
                                      borderTop: "1px solid #e0e0e0",
                                      cursor: "pointer",
                                    }}
                                  >
                                    + Add New Ancillary Charge
                                  </li>
                                );
                              }
                              const charge = ancillaryCharges.find(
                                (c) => c.ancillaryChargeName === option
                              );
                              return (
                                <li {...props}>
                                  {option} (
                                  {charge?.ancillaryChargeCurrency}{" "}
                                  {charge?.ancillaryChargeCost})
                                </li>
                              );
                            }}
                            ListboxProps={{
                              style: {
                                maxHeight: "200px",
                              },
                            }}
                            filterOptions={(options, state) => {
                              const filtered = options?.filter(
                                (option) =>
                                  option
                                    ?.toLowerCase()
                                    ?.includes(
                                      state.inputValue.toLowerCase()
                                    )
                              );
                              if (!filtered.includes("add_new")) {
                                filtered.push("add_new");
                              }
                              return filtered;
                            }}
                          />
                        </FormControl>
                      ) : (
                        <TextField
                          fullWidth
                          variant="standard"
                          value={item.description}
                          onChange={(e) =>
                            onItemChange(
                              item.id,
                              "description",
                              e.target.value
                            )
                          }
                          size="small"
                          placeholder="Type or click to select an item."
                          InputProps={{
                            sx: {
                              maxHeight: "40px",
                              display: "flex",
                              alignItems: "center",
                              fontFamily: "inter",
                            },
                          }}
                        />
                      )}
                      {formErrors.serviceItem && (
                        <Typography color="error" variant="caption">
                          {formErrors.serviceItem}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ width: "15%" }}>
                      <TextField
                        fullWidth
                        type="number"
                        variant="standard"
                        value={item.cost}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length <= 13) {
                            onItemChange(
                              item.id,
                              "cost",
                              Math.max(0, parseFloat(value) || 0)
                            );
                          }
                        }}
                        size="small"
                        inputProps={{
                          inputMode: "numeric",
                          style: { textAlign: "right" },
                          step: "any",
                          maxLength: 13
                        }}
                        InputProps={{
                          sx: {
                            maxHeight: "40px",
                            display: "flex",
                            alignItems: "center",
                            fontFamily: "inter",
                            "& input[type=number]": {
                              MozAppearance: "textfield",
                            },
                            "& input[type=number]::-webkit-outer-spin-button": {
                              WebkitAppearance: "none",
                              margin: 0,
                            },
                            "& input[type=number]::-webkit-inner-spin-button": {
                              WebkitAppearance: "none",
                              margin: 0,
                            },
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: "8%" }}>
                      <TextField
                        fullWidth
                        type="number"
                        variant="standard"
                        value={item.quantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length <= 5) {
                            onItemChange(
                              item.id,
                              "quantity",
                              Math.max(0, parseFloat(value) || 0)
                            );
                          }
                        }}
                        size="small"
                        inputProps={{
                          maxLength: 5,
                          style: {
                            textAlign: "left",
                            textIndent: "20px",
                          },
                        }}
                        InputProps={{
                          sx: {
                            maxHeight: "40px",
                            display: "flex",
                            alignItems: "center",
                            fontFamily: "inter",
                          },
                        }}
                      />
                    </TableCell>

                    <TableCell sx={{ width: "8%" }}>
                      <TextField
                        fullWidth
                        type="number"
                        variant="standard"
                        value={
                          item.discount === 0 ||
                          item.discount === undefined
                            ? ""
                            : item.discount
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length <= 5) {
                            onItemChange(
                              item.id,
                              "discount",
                              Math.max(
                                0,
                                Math.min(
                                  100,
                                  parseFloat(value) || 0
                                )
                              )
                            );
                          }
                        }}
                        size="small"
                        inputProps={{
                          inputMode: "numeric",
                          min: 0,
                          max: 100,
                          style: { textAlign: "right" },
                          step: "any",
                          maxLength: 5
                        }}
                        InputProps={{
                          sx: {
                            maxHeight: "40px",
                            display: "flex",
                            alignItems: "center",
                            fontFamily: "inter",
                            "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
                              display: "none"
                            },
                            "-moz-appearance": "textfield"
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: "8%" }}>
                      <TextField
                        fullWidth
                        type="number"
                        variant="standard"
                        value={
                          item.tax === 0 || item.tax === undefined
                            ? ""
                            : item.tax
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length <= 5) {
                            onItemChange(
                              item.id,
                              "tax",
                              Math.max(
                                0,
                                Math.min(
                                  100,
                                  parseFloat(value) || 0
                                )
                              )
                            );
                          }
                        }}
                        size="small"
                        inputProps={{
                          inputMode: "numeric",
                          min: 0,
                          max: 100,
                          style: { textAlign: "right" },
                          step: "any",
                          maxLength: 5
                        }}
                        InputProps={{
                          sx: {
                            maxHeight: "40px",
                            display: "flex",
                            alignItems: "center",
                            fontFamily: "inter",
                            "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
                              display: "none"
                            },
                            "-moz-appearance": "textfield"
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: "18%" }}>
                      <p className="font-medium font-inter" style={{fontFamily: "inter"}}>
                        {form.currencyCode} {" "} 
                        {
                          item.amount === 0 || item.amount === undefined
                            ? ""
                            : item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        }
                      </p>
                    </TableCell>
                    <TableCell
                      sx={{ width: "8%", whiteSpace: "nowrap" }}
                    >
                      <Box className="action-buttons">
                        <IoMdAddCircleOutline
                          size={22}
                          style={{ color: "green", cursor: "pointer" }}
                          onClick={() => onAddItem("service")}
                        />
                        {serviceOnlyItemsCount > 1 && (
                          <Delete
                            fontSize="small"
                            style={{ color: "#D32F2F", cursor: "pointer" }}
                            onClick={() => {
                              onDeleteItem(item.id);
                              onItemMenuAnchorElChange(null);
                              onSelectedItemIdChange(null);
                            }}
                          />
                        )}
                        <MoreVert 
                          fontSize="medium" 
                          sx={{ cursor:"pointer", color:"gray" }}  
                          onClick={(event) => {
                            event.stopPropagation();
                            onItemMenuAnchorElChange(event.currentTarget);
                            onSelectedItemIdChange(item.id);
                            onInvoiceMenuAnchorElChange(null);
                          }} 
                        />
                      </Box>
                      <Menu
                        anchorEl={itemMenuAnchorEl}
                        open={Boolean(itemMenuAnchorEl) && selectedItemId === item.id}
                        onClose={() => {
                          onItemMenuAnchorElChange(null);
                          onSelectedItemIdChange(null);
                        }}
                      >
                        <MenuItem
                          onClick={() => {
                            const sectionExists = serviceItems.some(
                              (item) => item.type === "category" && item.description === "INVLI002"
                            );
                            if (!sectionExists) {
                              onAddItem("category", item.id, "INVLI002");
                            }
                            onItemMenuAnchorElChange(null);
                            onSelectedItemIdChange(null);
                          }}
                          disabled={rowsWithSections.has(item.id)}
                        >
                          <ListItemIcon>
                            <Add fontSize="small" />
                          </ListItemIcon>
                          <ListItemText>Add Section</ListItemText>
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            onCloneItem(item.id);
                            onItemMenuAnchorElChange(null);
                            onSelectedItemIdChange(null);
                          }}
                        >
                          <ListItemIcon>
                            <ContentCopy fontSize="small" />
                          </ListItemIcon>
                          <ListItemText>Clone Item</ListItemText>
                        </MenuItem>
                      </Menu>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell
                      colSpan={3}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 1,
                        gap: 1,
                      }}
                    >
                      <IconButton size="small" disableRipple>
                        <Apps fontSize="small" />
                      </IconButton>
                      <FormControl fullWidth size="small">
                        <Select
                          value={item.lineItemType || "INVLI001"}
                          onChange={(e) =>
                            onSectionLineItemTypeChange(
                              item.id,
                              e.target.value
                            )
                          }
                          displayEmpty
                          size="small"
                          sx={{
                            fontWeight: 600,
                            maxHeight: "30px",
                            display: "flex",
                            fontFamily: "inter",
                            alignItems: "center",
                          }}
                        >
                          {INVOICE_LINE_ITEMS?.map((item) => (
                            <MenuItem
                              key={item.value}
                              value={item.value}
                            >
                              {item.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>

                    <TableCell
                      sx={{ width: "8%", whiteSpace: "nowrap" }}
                    >
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          onItemMenuAnchorElChange(event.currentTarget);
                          onSelectedItemIdChange(item.id);
                          onInvoiceMenuAnchorElChange(null);
                        }}
                        onMouseDown={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                      <Menu
                        anchorEl={itemMenuAnchorEl}
                        open={
                          Boolean(itemMenuAnchorEl) &&
                          selectedItemId === item.id
                        }
                        onClose={() => {
                          onItemMenuAnchorElChange(null);
                          onSelectedItemIdChange(null);
                        }}
                      >
                        <MenuItem
                          onClick={() => {
                            onDeleteItem(item.id);
                            onItemMenuAnchorElChange(null);
                            onSelectedItemIdChange(null);
                          }}
                        >
                          <ListItemIcon>
                            <Delete fontSize="small" color="error" />
                          </ListItemIcon>
                          <ListItemText>Delete Section</ListItemText>
                        </MenuItem>
                      </Menu>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default InvoiceItemsTable;