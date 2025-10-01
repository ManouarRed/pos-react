import React, { useState, useEffect } from 'react';
  import { Product, ProductFormData, Category, Manufacturer, SizeStock } from '../../types';
  import { productService } from '../../services/productService';
  import { Button } from '../common/Button';
  import { Input } from '../common/Input';
  import { Select } from '../common/Select';
  import { Textarea } from '../common/Textarea'; 
  import { useLanguage } from '../../contexts/LanguageContext';

  interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (productData: ProductFormData) => void;
    product: Product | null;
  }

  const initialFormDataBase: Omit<ProductFormData, 'categoryId' | 'manufacturerId'> = {
    title: '',
    code: '',
    price: 0,
    sizes: '[]', 
    image: '',
    fullSizeImage: '',
    isVisible: true,
  };

  export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSave, product }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<ProductFormData>({ ...initialFormDataBase, categoryId: '', manufacturerId: '' });
    const [sizes, setSizes] = useState<SizeStock[]>([]);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});
    const [categories, setCategories] = useState<Category[]>([]);
    const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
    const [isLoadingDropdowns, setIsLoadingDropdowns] = useState<boolean>(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [dropdownError, setDropdownError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({ ...prev, sizes: JSON.stringify(sizes) }));
        }
    }, [sizes, isOpen]);

    useEffect(() => {
        const loadDropdownData = async () => {
            if (!isOpen) return;
            setIsLoadingDropdowns(true);
            setDropdownError(null);
            try {
                const [fetchedCategoriesResponse, fetchedManufacturers] = await Promise.all([
                    productService.fetchCategories(),
                    productService.fetchManufacturers()
                ]);
                const fetchedCategories = fetchedCategoriesResponse.items;
                setCategories(fetchedCategories);
                setManufacturers(fetchedManufacturers);

                if (product) {
                    setSizes(product.sizes || []);
                    setFormData({
                        id: product.id,
                        title: product.title,
                        code: product.code,
                        categoryId: product.categoryId,
                        manufacturerId: product.manufacturerId,
                        price: product.price,
                        sizes: JSON.stringify(product.sizes || []),
                        image: product.image,
                        fullSizeImage: product.fullSizeImage || '',
                        isVisible: product.isVisible,
                    });
                } else {
                    setSizes([]);
                    setFormData({
                        ...initialFormDataBase,
                        categoryId: fetchedCategories.length > 0 ? fetchedCategories[0].id : '',
                        manufacturerId: fetchedManufacturers.length > 0 ? fetchedManufacturers[0].id : '',
                        sizes: '[]'
                    });
                }
                setFormErrors({});

            } catch (error) {
                console.error("Failed to load categories or manufacturers for form:", error);
                setDropdownError(t('errors.failedToLoadData', { entity: "dropdown options" }));
            } finally {
                setIsLoadingDropdowns(false);
            }
        };

        loadDropdownData();

    }, [isOpen, product, t]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        if (formErrors[name as keyof ProductFormData]) {
            setFormErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSizeChange = (index: number, field: keyof SizeStock, value: string | number) => {
        const newSizes = sizes.map((item, i) => {
            if (i === index) {
                return { ...item, [field]: value };
            }
            return item;
        });
        setSizes(newSizes);
    };

    const addSize = () => {
        setSizes([...sizes, { size: '', stock: 0 }]);
    };

    const removeSize = (indexToRemove: number) => {
        setSizes(prevSizes => prevSizes.filter((_, index) => index !== indexToRemove));
    };

    const handleImageUpload = async () => {
        if (!imageFile) return;
        setIsUploading(true);
        try {
            const { imageUrl, fullSizeImageUrl } = await productService.uploadImageFile(imageFile);
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            setFormData(prev => ({ ...prev, image: `${baseUrl}${imageUrl}`, fullSizeImage: `${baseUrl}${fullSizeImageUrl}` }));
            setImageFile(null);
        } catch (error) {
            console.error("Failed to upload image:", error);
            // You might want to set an error state here to show in the UI
        } finally {
            setIsUploading(false);
        }
    };

    const validateForm = (): boolean => {
        const errors: Partial<Record<keyof ProductFormData, string>> = {};
        if (!formData.title.trim()) errors.title = t('common.title') + " " + t('errors.isRequired');
        if (!formData.code.trim()) errors.code = t('common.code') + " " + t('errors.isRequired');
        if (!formData.categoryId) errors.categoryId = t('common.category') + " " + t('errors.isRequired');
        if (!formData.manufacturerId) errors.manufacturerId = t('common.manufacturer') + " " + t('errors.isRequired');

        const priceValue = parseFloat(String(formData.price));
        if (isNaN(priceValue) || priceValue <= 0) errors.price = t('common.price') + " must be > 0.";

        // Validate image: either URL or file upload, but not both
        if (!formData.image.trim() && !imageFile) {
            errors.image = t('common.imageURL') + " " + t('errors.isRequired') + " or an image file must be uploaded.";
        } else if (formData.image.trim() && imageFile) {
            errors.image = t('common.imageURL') + " " + t('errors.notBothImageAndURL');
        } else if (formData.image.trim()) {
            try {
                new URL(formData.image);
            } catch (_) {
                errors.image = t('common.imageURL') + " (Thumbnail) " + t('errors.isInvalid');
            }
        }

        // Full size image validation (only if a thumbnail image is provided via URL)
        if (formData.image.trim() && !imageFile) { // Only validate fullSizeImage if image URL is provided and no file is uploaded
            if (!formData.fullSizeImage.trim()) {
                errors.fullSizeImage = t('common.imageURL') + " (Full Size) " + t('errors.isRequired');
            } else {
                try {
                    new URL(formData.fullSizeImage);
                } catch (_) {
                    errors.fullSizeImage = t('common.imageURL') + " (Full Size) " + t('errors.isInvalid');
                }
            }
        }

        if (sizes.some(s => !s.size || s.size.trim() === '' || s.stock < 0)) {
            errors.sizes = t('errors.sizeStockInvalid', 'Each size must have a name and a non-negative stock.');
        } else {
            const sizeNames = sizes.map(s => s.size.trim().toLowerCase());
            if (new Set(sizeNames).size !== sizeNames.length) {
                errors.sizes = t('errors.sizeDuplicate', 'Size names must be unique.');
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSave({
                ...formData,
                price: parseFloat(String(formData.price)),
            });
        }
    };

    if (!isOpen) return null;

    const categoryOptions = categories.map(cat => ({ value: cat.id, label: cat.name }));
    const manufacturerOptions = manufacturers.map(man => ({ value: man.id, label: man.name }));

    return (
        <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
        >
            <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 id="product-modal-title" className="text-xl font-semibold text-gray-800">
                        {product ? t('common.edit') + " " + t('common.productTitle') : t('common.addNew') + " " + t('common.productTitle')}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </Button>
                </div>

                {isLoadingDropdowns && <p className="text-center text-gray-500 py-4">{t('common.loading')} dropdown data...</p>}
                {dropdownError && <p className="text-center text-red-500 py-4 bg-red-50 rounded-md">{dropdownError}</p>}

                {!isLoadingDropdowns && !dropdownError && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label={t('common.productTitle')}
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            error={formErrors.title}
                            required
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label={t('common.code')}
                                id="code"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                error={formErrors.code}
                                required
                            />
                            <Select
                                label={t('common.category')}
                                id="categoryId"
                                name="categoryId"
                                value={formData.categoryId}
                                onChange={handleChange}
                                options={categoryOptions}
                                error={formErrors.categoryId}
                                disabled={categories.length === 0}
                                required
                            />
                        </div>
                        <Select
                            label={t('common.manufacturer')}
                            id="manufacturerId"
                            name="manufacturerId"
                            value={formData.manufacturerId}
                            onChange={handleChange}
                            options={manufacturerOptions}
                            error={formErrors.manufacturerId}
                            disabled={manufacturers.length === 0}
                            required
                        />

                        <Input
                            label={t('common.price') + " (€)"}
                            id="price"
                            name="price"
                            type="number"
                            value={formData.price}
                            onChange={handleChange}
                            min="0.01"
                            step="0.01"
                            error={formErrors.price}
                            required
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('common.size')} / {t('common.stock')}
                            </label>
                            {sizes.map((sizeStock, index) => (
                                <div key={index} className="flex items-center space-x-2 mb-2">
                                    <Input
                                        placeholder={t('common.size')}
                                        value={sizeStock.size}
                                        onChange={(e) => handleSizeChange(index, 'size', e.target.value)}
                                        className="w-full"
                                    />
                                    <Input
                                        type="number"
                                        placeholder={t('common.stock')}
                                        value={sizeStock.stock}
                                        onChange={(e) => handleSizeChange(index, 'stock', parseInt(e.target.value, 10) || 0)}
                                        className="w-full"
                                        min="0"
                                    />
                                    <Button type="button" variant="danger" size="sm" onClick={() => removeSize(index)}>
                                        &times;
                                    </Button>
                                </div>
                            ))}
                            <Button type="button" variant="secondary" onClick={addSize} key={t('common.addSize')}>
                                {t('common.addSize')}
                            </Button>
                            {formErrors.sizes && <p className="mt-1 text-xs text-red-600">{formErrors.sizes}</p>}
                        </div>

                        <Input
                            label={t('common.imageURL') + " (Thumbnail)"}
                            id="image"
                            name="image"
                            type="url"
                            value={formData.image}
                            onChange={handleChange}
                            error={formErrors.image}
                            placeholder="https://example.com/thumbnail.jpg"
                        />
                        <div className="flex items-center space-x-2">
                            <Input
                                type="file"
                                onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
                                className="w-full"
                            />
                            <Button type="button" onClick={handleImageUpload} disabled={!imageFile || isUploading}>
                                {isUploading ? t('common.uploading', 'Uploading...') : t('common.upload', 'Upload')}
                            </Button>
                        </div>
                        <Input
                            label={t('common.imageURL') + " (Full Size)"}
                            id="fullSizeImage"
                            name="fullSizeImage"
                            type="url"
                            value={formData.fullSizeImage}
                            onChange={handleChange}
                            error={formErrors.fullSizeImage}
                            placeholder="https://example.com/fullsize.jpg"
                        />
                        <div className="flex items-center">
                            <input
                                id="isVisible"
                                name="isVisible"
                                type="checkbox"
                                checked={formData.isVisible}
                                onChange={handleChange}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="isVisible" className="ml-2 block text-sm text-gray-900">
                                {t('common.productIsVisible')}
                            </label>
                        </div>

                        <div className="pt-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                            <Button type="button" variant="secondary" onClick={onClose}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" variant="primary">
                                {product ? t('common.saveChanges') : t('common.add') + " " + t('common.productTitle').toLowerCase()}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

// Add to locales/en.json under "common"
// "productIsVisible": "Product is visible to customers",
// "addNew": "Add New",
// "addSize": "Add Size",
// "filterBy": "Filter by",
// "sortBy": "Sort By",
// "clearFiltersAndSort": "Clear Filters & Sort",
// "bulkEdit": "Bulk Edit",
// "deleteSelected": "Delete Selected",
// "import": "Import",
// "export": "Export",
// "duplicate": "Duplicate",
// "cannotBeUndone": "This action cannot be undone."

// Add to locales/en.json under "errors"
// "sizeStockInvalid": "Each size must have a name and a non-negative stock.",
// "sizeDuplicate": "Size names must be unique."

// And corresponding in locales/sk.json
// "productIsVisible": "Produkt je viditeľný pre zákazníkov",
// "addNew": "Pridať nový",
// "addSize": "Pridať veľkosť",
// "filterBy": "Filtrovať podľa",
// "sortBy": "Zoradiť podľa",
// "clearFiltersAndSort": "Vymazať filtre a zoradenie",
// "bulkEdit": "Hromadná úprava",
// "deleteSelected": "Odstrániť vybrané",
// "import": "Importovať",
// "export": "Exportovať",
// "duplicate": "Duplikovať",
// "cannotBeUndone": "Táto akcia je nevratná."

// And corresponding in locales/sk.json under "errors"
// "sizeStockInvalid": "Každá veľkosť musí mať názov a nezáporné skladové zásoby.",
// "sizeDuplicate": "Názvy veľkostí musia byť jedinečné."