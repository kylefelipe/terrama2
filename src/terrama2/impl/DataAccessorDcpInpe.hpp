/*
 Copyright (C) 2007 National Institute For Space Research (INPE) - Brazil.

 This file is part of TerraMA2 - a free and open source computational
 platform for analysis, monitoring, and alert of geo-environmental extremes.

 TerraMA2 is free software: you can redistribute it and/or modify
 it under the terms of the GNU Lesser General Public License as published by
 the Free Software Foundation, either version 3 of the License,
 or (at your option) any later version.

 TerraMA2 is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public License
 along with TerraMA2. See LICENSE. If not, write to
 TerraMA2 Team at <terrama2-team@dpi.inpe.br>.
 */

/*!
  \file terrama2/core/data-access/DataAccessorDcpInpe.hpp

  \brief

  \author Jano Simas
 */

#ifndef __TERRAMA2_CORE_DATA_ACCESS_DATA_ACCESSOR_DCP_INPE_HPP__
#define __TERRAMA2_CORE_DATA_ACCESS_DATA_ACCESSOR_DCP_INPE_HPP__

//TerraMA2
#include "Config.hpp"
#include "DataAccessorFile.hpp"
#include "../core/Shared.hpp"
#include "../core/data-access/DataAccessorDcp.hpp"
#include "../core/data-model/DataSet.hpp"
#include "../core/data-model/Filter.hpp"

namespace terrama2
{
  namespace core
  {
    /*!
      \class DataAccessorDcpInpe
      \brief DataAccessor for DCP DataSeries from INPE.

    */
    class TMIMPLEXPORT DataAccessorDcpInpe : public DataAccessorDcp, public DataAccessorFile
    {
    public:
      DataAccessorDcpInpe(DataProviderPtr dataProvider, DataSeriesPtr dataSeries, const bool checkSemantics = true);
      virtual ~DataAccessorDcpInpe() {}

      static DataAccessorPtr make(DataProviderPtr dataProvider, DataSeriesPtr dataSeries);
      static DataAccessorType dataAccessorType(){ return "DCP-inpe"; }

      /*!
       * \brief Check and validates data timestamp, comparing last collected data with datetime in content
       * process.
       *
       * \note It does not throw exception.
       *
       * \param dataSet TerraMA2 dataset
       * \param index Row index
       * \param filter Temporal filter
       * \param dateColumn Datetime column index
       * \return Returns if it is new data
       */
      virtual bool isValidTimestamp(std::shared_ptr<SynchronizedDataSet> dataSet,
                                    size_t index,
                                    const Filter& filter,
                                    size_t dateColumn) const override;

    protected:
      virtual std::string dataSourceType() const override;
      virtual std::string typePrefix() const override;

      virtual void adapt(DataSetPtr dataset, std::shared_ptr<te::da::DataSetTypeConverter> converter) const override;
      virtual void addColumns(std::shared_ptr<te::da::DataSetTypeConverter> converter, const std::shared_ptr<te::da::DataSetType>& datasetType) const override;

    private:
      /*!
        \brief Convert string to TimeInstantTZ.

        \note Format recognized:  mm/dd/YYYY HH:MM:SS"

      */
      te::dt::AbstractData* stringToTimestamp(te::da::DataSet* dataset, const std::vector<std::size_t>& indexes, int /*dstType*/, const std::string& timezone) const;
    };
  }
}

#endif // __TERRAMA2_CORE_DATA_ACCESS_DATA_ACCESSOR_DCP_INPE_HPP__
