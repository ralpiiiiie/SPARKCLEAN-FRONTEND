import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { ArrowRight, Factory, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

export function CaseStudy() {
  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <PageHeader
          eyebrow="Case Study"
          title="Spark Clean Laundry Business Analytics"
          description="Capstone project · Database Business Analytics — a laundry network of 6 branches and 2 processing plants in Metro Cebu."
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Background</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Spark Clean Laundry operates in Cebu, Philippines, with 6 branches serving 
              customers across the metro area. Laundry is collected from branches and 
              processed at 2 central plants before being delivered back to branches.
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-aqua/10">
                <Factory className="w-5 h-5 text-aqua" />
                <div>
                  <p className="font-medium">6 Branches</p>
                  <p className="text-sm text-gray-600">Cebu City, Mandaue, Lapu-Lapu, Talisay, Consolacion, Minglanilla</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-xl bg-teal/10">
                <Truck className="w-5 h-5 text-teal" />
                <div>
                  <p className="font-medium">2 Processing Plants</p>
                  <p className="text-sm text-gray-600">Cebu City Plant, Mandaue Plant</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Problems</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-4 rounded-xl border-l-4 border-coral bg-coral/5">
                <h4 className="font-semibold mb-1">Problem 1: Demand Forecasting</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Current 3-month smoothing average leads to under-forecasting (lost sales, 
                  rush deliveries) and over-forecasting (idle capacity, wasted supplies)
                </p>
              </div>
              
              <div className="p-4 rounded-xl border-l-4 border-aqua bg-aqua/5">
                <h4 className="font-semibold mb-1">Problem 2: Delivery Optimization</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Delivery costs vary by distance, but no optimization exists for 
                  monthly plant-to-branch allocation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>7-Step Monthly BA Procedure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Collect costs', desc: 'Update delivery costs, plant capacity, rush/storage costs' },
              { step: 2, title: 'Update monthly demand', desc: 'Gather latest demand data for each branch' },
              { step: 3, title: 'Check plant capacity', desc: 'Verify total demand vs plant capacity' },
              { step: 4, title: 'Rerun curve fitting', desc: 'Fit linear/quadratic/cubic models per branch' },
              { step: 5, title: 'Forecast demand', desc: 'Generate 1-6 month forecasts using best models' },
              { step: 6, title: 'Build optimization model', desc: 'Set up transportation model with costs and demands' },
              { step: 7, title: 'Solve and extract schedule', desc: 'Generate minimum-cost delivery schedule' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
